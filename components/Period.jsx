import {
  Heading,
  Text,
  Link,
  Box,
} from '@chakra-ui/react'
import { ArrowForwardIcon, TimeIcon } from '@chakra-ui/icons'

const Period = ({periodName, startBlockNumber, endBlockNumber}) => {
    return (
          <Box
          d="inline-block"
          mb={5}
          borderRadius="md"
          background="gray.900"
          py={5}
          px={6}
        >
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
          <Text size="xs">
            <Text as="span" d="inline" fontWeight="medium">
              Blocks:{' '}
            </Text>
            <Link
              href={`https://etherscan.io/block/${startBlockNumber}`}
              isExternal
              borderBottom="1px rgba(255,255,255,0.66) dotted" borderRadius={1} _hover={{ textDecoration: "none", borderBottom: "1px rgba(255,255,255,0.9) dotted" }}
            >
              {startBlockNumber}
            </Link>{' '}
            <ArrowForwardIcon transform="translateY(-1.5px)" />{' '}
            <Link
              href={`https://etherscan.io/block/${endBlockNumber}`}
              isExternal
              borderBottom="1px rgba(255,255,255,0.66) dotted" borderRadius={1} _hover={{ textDecoration: "none", borderBottom: "1px rgba(255,255,255,0.9) dotted" }}
            >
              {endBlockNumber}
            </Link>
          </Text>
        </Box>
    )}

export default Period