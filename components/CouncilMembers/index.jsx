import { useState, useEffect } from "react";
import {
  Button,
  Spinner,
  Box,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  useToast,
  SimpleGrid,
} from "@chakra-ui/react";
import Council from "./Council";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { ethers } from "ethers";
import SafeBatchSubmitter from "../../lib/SafeBatchSubmitter.js";
import {
  COUNCIL_SAFE_ADDRESS,
  SNX_TOKEN_ADDRESS,
  SPARTAN_COUNCIL_NFT_ADDRESS,
  AMBASSADORS_COUNCIL_NFT_ADDRESS,
  GRANTS_COUNCIL_NFT_ADDRESS,
  TREASURY_COUNCIL_NFT_ADDRESS,
} from "../../config.js";

async function generateSafeBatchSubmitter() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  let signer = provider.getSigner();
  signer.address = await signer.getAddress();
  let network = await provider.getNetwork();
  const safeBatchSubmitter = new SafeBatchSubmitter({
    network: network.name,
    signer,
    safeAddress: COUNCIL_SAFE_ADDRESS,
  });
  await safeBatchSubmitter.init();
  return safeBatchSubmitter;
}

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

const CouncilMembers = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [payouts, setPayouts] = useState({});
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [blockNumber, setBlockNumber] = useState(0);
  const [providerUrl, setProviderUrl] = useState("");
  const toast = useToast();

  useEffect(() => {
    (async () => {
      setLoadingMembers(true);
      const result = await blocksClient.query({
        query: gql(blocksQuery(new Date(date).getTime() / 1000)),
      });
      if (result.data.blocks[0]) {
        setBlockNumber(parseInt(result.data.blocks[0].number));
      } else {
        alert("No block found at this date!");
      }
    })();
  }, [date, providerUrl]);

  useEffect(() => {
    (async () => {
      const blockTag = blockNumber == 0 ? "latest" : blockNumber;
      const erc721Interface = new ethers.utils.Interface([
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function ownerOf(uint256) view returns (address)",
      ]);

      const provider = providerUrl.length
        ? new ethers.providers.JsonRpcProvider(providerUrl)
        : new ethers.providers.Web3Provider(window.ethereum);

      const nftAddresses = [
        SPARTAN_COUNCIL_NFT_ADDRESS,
        TREASURY_COUNCIL_NFT_ADDRESS,
        GRANTS_COUNCIL_NFT_ADDRESS,
        AMBASSADORS_COUNCIL_NFT_ADDRESS,
      ];

      let newPayouts = {};
      for (var i = 0; i < nftAddresses.length; i++) {
        const nftContract = new ethers.Contract(
          nftAddresses[i],
          erc721Interface,
          provider
        );

        const tokenCount = await nftContract.totalSupply({
          blockTag,
        });
        let newMemberAddresses = [];
        for (var j = 1; j <= tokenCount; j++) {
          newMemberAddresses.push(
            ethers.utils.getAddress(await nftContract.ownerOf(j, { blockTag }))
          );
        }

        newPayouts[nftAddresses[i]] = {
          name: await nftContract.name({ blockTag }),
          symbol: await nftContract.symbol({ blockTag }),
          stipend: 2000,
          members: newMemberAddresses,
        };
      }
      setPayouts(newPayouts);
      setLoadingMembers(false);
    })();
  }, [blockNumber]);

  const queueActions = async () => {
    setLoading(true);

    const erc20Interface = new ethers.utils.Interface([
      "function transfer(address recipient, uint256 amount)",
      "function balanceOf(address account) view returns (uint256)",
    ]);

    // Confirm the Gnosis Safe has a sufficient balance
    const totalPayout = Object.values(payouts).reduce((acc, v) => {
      return acc + v.members.length * v.stipend;
    }, 0);
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const snxContract = new ethers.Contract(
      SNX_TOKEN_ADDRESS,
      erc20Interface,
      provider
    );
    const currentBalance = await snxContract.balanceOf(COUNCIL_SAFE_ADDRESS);
    const parsedBalance = parseInt(ethers.utils.formatEther(currentBalance));
    if (totalPayout > parsedBalance) {
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
    for (var i = 0; i < Object.values(payouts).length; i++) {
      for (var j = 0; j < Object.values(payouts)[i].members.length; j++) {
        const data = erc20Interface.encodeFunctionData("transfer", [
          Object.values(payouts)[i].members[j],
          ethers.utils.parseEther(Object.values(payouts)[i].stipend.toString()),
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

  return (
    <Box py={4}>
      {loadingMembers ? (
        <Box textAlign="center">
          <Spinner my="6" />
        </Box>
      ) : (
        Object.keys(payouts).map((nftAddress, i) => {
          return (
            <Council
              key={"council-" + i}
              nftAddress={nftAddress}
              name={payouts[nftAddress].name}
              symbol={payouts[nftAddress].symbol}
              stipend={payouts[nftAddress].stipend}
              members={payouts[nftAddress].members}
            />
          );
        })
      )}
      <Button
        background="#00d1ff"
        width="100%"
        _hover={{ background: "#58e1ff" }}
        color="white"
        onClick={queueActions}
        mt={6}
        mb={12}
        size="lg"
        isLoading={loading}
        textTransform="uppercase"
        fontFamily="GT America"
        letterSpacing={1}
        fontWeight={400}
      >
        Queue Payouts
      </Button>
      <SimpleGrid columns="2" spacing="5">
        <FormControl mb={4}>
          <FormLabel htmlFor="date">
            Show holders of Council NFTs on...
          </FormLabel>
          <Input
            id="date"
            size="sm"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </FormControl>
        <FormControl mb={4}>
          <FormLabel htmlFor="providerUrl">Enter a provider URL</FormLabel>
          <Input
            id="providerUrl"
            size="sm"
            type="text"
            value={providerUrl}
            placeholder="https://mainnet.infura.io/v3/InfuraKey"
            onChange={(event) => setProviderUrl(event.target.value)}
          />
          <FormHelperText>
            Enter the URL for a provider with an archival node to fetch
            historical data.
          </FormHelperText>
        </FormControl>
      </SimpleGrid>
    </Box>
  );
};

export default CouncilMembers;
