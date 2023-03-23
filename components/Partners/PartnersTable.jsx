import {
  Box,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tfoot,
  Link,
} from "@chakra-ui/react";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { PARTNER_ADDRESSES_L1, PARTNER_ADDRESSES_L2 } from "../../config.js";
import { useEffect, useState } from "react";

import { loadedConversion } from "../../store";
import { useRecoilState } from "recoil";

const snxClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-rates",
  cache: new InMemoryCache(),
});

const PartnersTable = ({ layer, partnersData }) => {
  const [snxPrice, setSnxPrice] = useState(0);
  const [, setLoadedConversion] = useRecoilState(loadedConversion);
  const PARTNER_ADDRESSES =
    layer == 1 ? PARTNER_ADDRESSES_L1 : PARTNER_ADDRESSES_L2;

  useEffect(() => {
    snxClient
      .query({
        query: gql(`{
        fifteenMinuteSNXPrices(orderBy: id, orderDirection: desc, first: 1) {
          id
          averagePrice
        }
      }`),
      })
      .then((result) => {
        setSnxPrice(
          result.data.fifteenMinuteSNXPrices[0].averagePrice / 10 ** 18
        );
        setLoadedConversion(true);
      });
  }, []);

  const totalSnxPayout = partnersData.reduce((acc, p) => {
    return acc + p.payout;
  }, 0);

  return (
    <Table variant="simple" mb={6}>
      <Thead>
        <Tr>
          <Th>Partner</Th>
          <Th>Fees Generated (USD)</Th>
          <Th isNumeric>Payout (SNX)</Th>
        </Tr>
      </Thead>
      <Tbody>
        {partnersData.map((partner) => {
          return (
            <Tr key={partner.id}>
              <Td fontWeight="bold">
                <Link
                  href={`https://etherscan.io/address/${
                    PARTNER_ADDRESSES[partner.id]
                  }`}
                  isExternal
                  borderBottom="1px rgba(255,255,255,0.66) dotted"
                  borderRadius={1}
                  _hover={{
                    textDecoration: "none",
                    borderBottom: "1px rgba(255,255,255,0.9) dotted",
                  }}
                >
                  {partner.id}
                </Link>
              </Td>
              <Td>
                {partner.fees.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
                <Text
                  d="block"
                  fontSize="xs"
                  opacity={0.66}
                  fontWeight="semibold"
                >
                  {partner.percentage ? `${partner.percentage * 100}%` : ""}
                </Text>
              </Td>
              <Td isNumeric>
                {partner.payout.toLocaleString("en-US", {
                  maximumFractionDigits: 20,
                })}
                {snxPrice && (
                  <Text
                    d="block"
                    fontSize="xs"
                    opacity={0.66}
                    fontWeight="semibold"
                  >
                    {(snxPrice * partner.payout).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </Text>
                )}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
      <Tfoot>
        <Tr>
          <Th></Th>
          <Th>
            <Box pt={2} pb={0.5} color="white" opacity={0.85}>
              Totals
            </Box>
            <Text
              color="white"
              fontSize="md"
              letterSpacing={0}
              fontWeight="normal"
              mt={1}
            >
              {partnersData
                .reduce((acc, p) => {
                  return acc + p.fees;
                }, 0)
                .toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
            </Text>
            <Text d="block" fontSize="xs" fontWeight="semibold" mt={1}>
              100%
            </Text>
          </Th>
          <Th isNumeric>
            <Box pt={2} pb={0.5}>
              &nbsp;
            </Box>
            <Text
              color="white"
              fontSize="md"
              letterSpacing={0}
              fontWeight="normal"
              mt={1}
            >
              {totalSnxPayout.toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}{" "}
              SNX
            </Text>
            {snxPrice && (
              <Text d="block" fontSize="xs" fontWeight="semibold" mt={1}>
                {(snxPrice * totalSnxPayout).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </Text>
            )}
          </Th>
        </Tr>
      </Tfoot>
    </Table>
  );
};

export default PartnersTable;
