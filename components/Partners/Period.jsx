import { Heading, Text, Link, Box, Grid } from "@chakra-ui/react";
import { ArrowForwardIcon, TimeIcon } from "@chakra-ui/icons";

const Period = ({
  periodName,
  l1StartBlockNumber,
  l1EndBlockNumber,
  l2StartBlockNumber,
  l2EndBlockNumber,
}) => {
  return (
    <Box
      d="inline-block"
      mb={5}
      borderRadius="md"
      background="gray.900"
      py={5}
      px={6}
    >
      <Grid templateColumns="repeat(2, 1fr)" gap={3}>
        <Box>
          <Heading
            textTransform="uppercase"
            letterSpacing={1}
            fontSize="sm"
            fontWeight="medium"
            mb={1}
          >
            <TimeIcon transform="translateY(-1px)" mr={1.5} />
            Payout Period
          </Heading>
          <Text fontSize="xl" fontWeight="medium">
            {periodName}
          </Text>
        </Box>
        <Box>
          <Text size="xs">
            <Text as="span" d="inline" fontWeight="medium">
              L1 Blocks:{" "}
            </Text>
            <Link
              href={`https://etherscan.io/block/${l1StartBlockNumber}`}
              isExternal
              borderBottom="1px rgba(255,255,255,0.66) dotted"
              borderRadius={1}
              _hover={{
                textDecoration: "none",
                borderBottom: "1px rgba(255,255,255,0.9) dotted",
              }}
            >
              {l1StartBlockNumber}
            </Link>{" "}
            <ArrowForwardIcon transform="translateY(-1.5px)" />{" "}
            <Link
              href={`https://etherscan.io/block/${l1EndBlockNumber}`}
              isExternal
              borderBottom="1px rgba(255,255,255,0.66) dotted"
              borderRadius={1}
              _hover={{
                textDecoration: "none",
                borderBottom: "1px rgba(255,255,255,0.9) dotted",
              }}
            >
              {l1EndBlockNumber}
            </Link>
          </Text>
          <Text size="xs">
            <Text as="span" d="inline" fontWeight="medium">
              L2 Blocks:{" "}
            </Text>
            <Link
              href={`https://optimistic.etherscan.io/block/${l2StartBlockNumber}`}
              isExternal
              borderBottom="1px rgba(255,255,255,0.66) dotted"
              borderRadius={1}
              _hover={{
                textDecoration: "none",
                borderBottom: "1px rgba(255,255,255,0.9) dotted",
              }}
            >
              {l2StartBlockNumber}
            </Link>{" "}
            <ArrowForwardIcon transform="translateY(-1.5px)" />{" "}
            <Link
              href={`https://optimistic.etherscan.io/block/${l2EndBlockNumber}`}
              isExternal
              borderBottom="1px rgba(255,255,255,0.66) dotted"
              borderRadius={1}
              _hover={{
                textDecoration: "none",
                borderBottom: "1px rgba(255,255,255,0.9) dotted",
              }}
            >
              {l2EndBlockNumber}
            </Link>
          </Text>
        </Box>
      </Grid>
    </Box>
  );
};

export default Period;
