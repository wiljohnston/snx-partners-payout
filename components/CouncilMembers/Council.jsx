import {
  Box,
  Heading,
  Text,
  Link,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";

const Council = ({ name, symbol, stipend, nftAddress, members, layer }) => {
  return (
    <Box>
      <Heading d="inline" size="lg" fontWeight="semibold">
        {name}
      </Heading>
      <Link
        fontSize="sm"
        href={`https://etherscan.io/address/${nftAddress}`}
        isExternal
        borderBottom="1px rgba(255,255,255,0.66) dotted"
        borderRadius={1}
        _hover={{
          textDecoration: "none",
          borderBottom: "1px rgba(255,255,255,0.9) dotted",
        }}
        ml={3}
        d="inline-block"
        lineHeight="1.2"
        transform="translateY(-3px)"
      >
        {symbol} L{layer}
      </Link>
      <Table variant="simple" mt={3} mb={12}>
        <Thead>
          <Tr>
            <Th>Address</Th>
            <Th isNumeric>Stipend (SNX)</Th>
          </Tr>
        </Thead>
        <Tbody>
          {members.map((member, i) => {
            return (
              <Tr key={"member-" + i}>
                <Td fontWeight="bold">
                  <Text d="inline-block" isTruncated maxWidth={280}>
                    <Link
                      href={`https://etherscan.io/address/${member}`}
                      isExternal
                      borderBottom="1px rgba(255,255,255,0.66) dotted"
                      borderRadius={1}
                      _hover={{
                        textDecoration: "none",
                        borderBottom: "1px rgba(255,255,255,0.9) dotted",
                      }}
                    >
                      {member}
                    </Link>
                  </Text>
                </Td>
                <Td isNumeric>{stipend} SNX</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
};

export default Council;
