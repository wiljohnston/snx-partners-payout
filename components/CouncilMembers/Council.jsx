import { useEffect, useState } from "react";
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
import { ethers } from "ethers";

const Council = ({ name, nftAddress, stipend }) => {
  const [symbol, setSymbol] = useState("");
  const [memberAddresses, setMemberAddresses] = useState([]);

  useEffect(() => {
    (async () => {
      const erc721Interface = new ethers.utils.Interface([
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function ownerOf(uint256) view returns (address)",
      ]);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const nftContract = new ethers.Contract(
        nftAddress,
        erc721Interface,
        provider
      );

      setSymbol(await nftContract.symbol());

      const tokenCount = await nftContract.totalSupply();
      let newMemberAddresses = [];
      for (var i = 1; i <= tokenCount; i++) {
        newMemberAddresses.push(await nftContract.ownerOf(i));
      }
      setMemberAddresses(newMemberAddresses);
    })();
  }, []);

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
        {symbol}
      </Link>
      <Table variant="simple" mt={3} mb={12}>
        <Thead>
          <Tr>
            <Th>Address</Th>
            <Th isNumeric>Stipend (SNX)</Th>
          </Tr>
        </Thead>
        <Tbody>
          {memberAddresses.map((member, i) => {
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
