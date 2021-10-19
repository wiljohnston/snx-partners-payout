import { useEffect, useState } from "react";

import { Button, useToast, Grid } from "@chakra-ui/react";

import PartnersTable from "./PartnersTable";
import Period from "./Period";
import Status from "./Status";

import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { format, startOfMonth, subMonths } from "date-fns";
import { ethers } from "ethers";
import SafeBatchSubmitter from "../../lib/SafeBatchSubmitter.js";

import {
  GNOSIS_SAFE_ADDRESS,
  SNX_TOKEN_ADDRESS,
  PARTNER_ADDRESSES,
  SNX_TOTAL_DISTRIBUTION,
} from "../../config.js";

const snxQuery = (blockNumber) => `
{
  exchangePartners (block: {number: ${blockNumber}}) {
    id
    usdVolume
    usdFees
    trades
  }
}
`;
const snxClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanger",
  cache: new InMemoryCache(),
});

const blocksQuery = (timestamp) => `
{
  blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: {timestamp_gte: "${timestamp}"}) {
    id
    number
    timestamp
  }
}
`;

const blocksClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks",
  cache: new InMemoryCache(),
});

async function generateSafeBatchSubmitter() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  let signer = provider.getSigner();
  signer.address = await signer.getAddress();
  let network = await provider.getNetwork();
  const safeBatchSubmitter = new SafeBatchSubmitter({
    network: network.name,
    signer,
    safeAddress: GNOSIS_SAFE_ADDRESS,
  });
  await safeBatchSubmitter.init();
  return safeBatchSubmitter;
}

const Partners = () => {
  const [partnersData, setPartnersData] = useState([]);
  const [startBlockNumber, setStartBlockNumber] = useState(0);
  const [endBlockNumber, setEndBlockNumber] = useState(0);
  const [periodName, setPeriodName] = useState("");
  const [status, setStatus] = useState("none");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      // Get block numbers corresponding to the start of this month and last month
      const tz_offset = new Date().getTimezoneOffset() * 60 * 1000;

      const periodEnd = startOfMonth(new Date());
      const endBlockResult = await blocksClient.query({
        query: gql(blocksQuery((periodEnd.getTime() - tz_offset) / 1000)),
      });
      const endBlock = endBlockResult.data.blocks[0].number;

      const periodStart = subMonths(periodEnd, 1);
      const startBlockResult = await blocksClient.query({
        query: gql(blocksQuery((periodStart.getTime() - tz_offset) / 1000)),
      });
      const startBlock = startBlockResult.data.blocks[0].number;

      // Query partners data at these blocks
      const startPartnersResult = await snxClient.query({
        query: gql(snxQuery(startBlock)),
      });
      const endPartnersResult = await snxClient.query({
        query: gql(snxQuery(endBlock)),
      });

      // Set state accordingly
      setPeriodName(format(periodStart, "MMMM y"));
      setStartBlockNumber(startBlock);
      setEndBlockNumber(endBlock);
      processData(startPartnersResult, endPartnersResult);
    })();
  }, []);

  useEffect(() => {
    checkPaymentStatus();
  }, [partnersData]);

  const processData = (startPartnersResult, endPartnersResult) => {
    // Calculate fees for the period by taking the difference between the totals at start and end
    let result = Object.keys(PARTNER_ADDRESSES).map((id) => {
      const periodStartData = startPartnersResult.data.exchangePartners.filter(
        (p) => p.id == id
      )[0];
      const periodEndData = endPartnersResult.data.exchangePartners.filter(
        (p) => p.id == id
      )[0];
      return {
        id: id,
        fees:
          periodEndData.usdFees -
          (periodStartData ? periodStartData.usdFees : 0),
      };
    });

    // Calculate payout based on proportion of fees generated in the period
    const totalFees = result.reduce((acc, p) => {
      return acc + p.fees;
    }, 0);
    result = result
      .map((r) => {
        r.percentage = r.fees / totalFees;
        r.payout = SNX_TOTAL_DISTRIBUTION * r.percentage;
        return r;
      })
      .sort((a, b) => {
        return b.percentage > a.percentage ? 1 : -1;
      });

    setPartnersData(result);
  };

  const queueActions = async () => {
    setLoading(true);

    const erc20Interface = new ethers.utils.Interface([
      "function transfer(address recipient, uint256 amount)",
      "function balanceOf(address account) view returns (uint256)",
    ]);

    // Confirm the Gnosis Safe has a sufficient balance
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const snxContract = new ethers.Contract(
      SNX_TOKEN_ADDRESS,
      erc20Interface,
      provider
    );
    const currentBalance = await snxContract.balanceOf(GNOSIS_SAFE_ADDRESS);
    const parsedBalance = parseInt(ethers.utils.formatEther(currentBalance));
    if (SNX_TOTAL_DISTRIBUTION > parsedBalance) {
      toast({
        title: "Insufficient Funds",
        description: `The safe doesn't have enough SNX tokens to complete this payout.`,
        status: "error",
        isClosable: true,
      });
      setLoading(false);
      return;
    }

    // Queue transactions
    const safeBatchSubmitter = await generateSafeBatchSubmitter();

    for (let index = 0; index < partnersData.length; index++) {
      const partner = partnersData[index];
      if (partner.payout > 0) {
        const data = erc20Interface.encodeFunctionData("transfer", [
          PARTNER_ADDRESSES[partner.id],
          ethers.utils.parseEther(partner.payout.toString()),
        ]);
        await safeBatchSubmitter.appendTransaction({
          to: SNX_TOKEN_ADDRESS,
          data,
          force: false,
        });
      }
    }

    // Submit transactions
    try {
      const submitResult = await safeBatchSubmitter.submit();
      toast({
        title: "Transactions Queued",
        description: submitResult.transactions.length
          ? `You’ve successfully queued ${submitResult.transactions.length} transactions in the Gnosis Safe.`
          : "New transactions weren’t added. They are likely already awaiting execution in the Gnosis Safe.",
        status: "success",
        isClosable: true,
      });
    } catch {
      toast({
        title: "Error",
        description: `Something went wrong when attempting to queue these transactions.`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setLoading(false);
      checkPaymentStatus();
    }
  };

  const checkPaymentStatus = async () => {
    let newStatus = "none";
    let network = "homestead";

    try {
      const safeBatchSubmitter = await generateSafeBatchSubmitter();
      network = safeBatchSubmitter.network;
      // Check if there's a queued transaction with the same addresses to payout.
      const pendingTxns =
        await safeBatchSubmitter.service.getPendingTransactions(
          GNOSIS_SAFE_ADDRESS
        );
      if (
        pendingTxns.results.some((t) => {
          const a = t.dataDecoded.parameters[0].valueDecoded.map(
            (v) => v.dataDecoded.parameters[0].value
          );
          const b = Object.values(PARTNER_ADDRESSES);
          return a.sort().join(",") === b.sort().join(",");
        })
      ) {
        newStatus = "queued";
      }
    } catch {}

    // Check if there's past transaction
    const endpoint = `https://api${
      network != "homestead" ? "-" + network : ""
    }.etherscan.io/api?module=account&action=tokentx&contractaddress=${SNX_TOKEN_ADDRESS}&address=${GNOSIS_SAFE_ADDRESS}&page=1&offset=10000&sort=desc${
      process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
        ? "&apikey=" + process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
        : ""
    }`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (
      data.result.some((r) => {
        return partnersData.some((p) => {
          return (
            r.value.toString() ==
              ethers.utils.parseEther(p.payout.toString()).toString() &&
            Object.values(PARTNER_ADDRESSES).includes(
              ethers.utils.getAddress(r.to)
            )
          );
        });
      })
    ) {
      newStatus = "executed";
    }

    setStatus(newStatus);
  };

  return (
    <div>
      <Grid templateColumns="repeat(2, 1fr)" gap={4} pt={4}>
        <Period
          periodName={periodName}
          startBlockNumber={startBlockNumber}
          endBlockNumber={endBlockNumber}
        />
        <Status status={status} />
      </Grid>
      <PartnersTable partnersData={partnersData} />
      <Button
        background="#00d1ff"
        width="100%"
        _hover={{ background: "#58e1ff" }}
        color="white"
        onClick={queueActions}
        mb={8}
        size="lg"
        isLoading={loading}
        textTransform="uppercase"
        fontFamily="GT America"
        letterSpacing={1}
        fontWeight={400}
      >
        Queue Payouts
      </Button>
    </div>
  );
};

export default Partners;
