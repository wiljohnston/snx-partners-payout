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

const TransactionsTable = ({ transactions }) => {
  return (
    <Table variant="simple">
      <Thead>
        <Tr>
          <Th>Address</Th>
          <Th>SNX</Th>
          <Th isNumeric>sUSD</Th>
        </Tr>
      </Thead>
      <Tbody>
        {transactions.map((transaction, i) => {
          return (
            <Tr key={"t-" + i}>
              <Td fontWeight="bold" overflow="hidden">
                <Text isTruncated maxWidth={280}>
                  <Link
                    href={`https://etherscan.io/address/${transaction.address}`}
                    isExternal
                    borderBottom="1px rgba(255,255,255,0.66) dotted"
                    borderRadius={1}
                    _hover={{
                      textDecoration: "none",
                      borderBottom: "1px rgba(255,255,255,0.9) dotted",
                    }}
                  >
                    {transaction.address}
                  </Link>
                </Text>
              </Td>
              <Td>
                {transaction.snx.toLocaleString("en-US", {
                  maximumFractionDigits: 20,
                })}
              </Td>
              <Td isNumeric>
                {transaction.susd.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
      <Tfoot>
        <Tr>
          <Th></Th>
          <Th>
            <Box pt={2} pb={0.5} color="white" opacity={0.66}>
              Totals
            </Box>
            <Text
              color="white"
              fontSize="md"
              letterSpacing={0}
              fontWeight="normal"
              mt={1}
            >
              {transactions
                .reduce((acc, p) => {
                  return acc + p.snx;
                }, 0)
                .toLocaleString("en-US", {
                  maximumFractionDigits: 20,
                })}{" "}
              SNX
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
              {transactions
                .reduce((acc, p) => {
                  return acc + p.susd;
                }, 0)
                .toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
            </Text>
          </Th>
        </Tr>
      </Tfoot>
    </Table>
  );
};

export default TransactionsTable;
