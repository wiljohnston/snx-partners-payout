import { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import {
  Container,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link,
  Button,
  Box,
} from '@chakra-ui/react'
import { ArrowForwardIcon, TimeIcon } from '@chakra-ui/icons'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { format, startOfMonth, subMonths } from 'date-fns'

const snxQuery = (blockNumber: Number) => `
{
  exchangePartners (block: {number: ${blockNumber}}) {
    id
    usdVolume
    usdFees
    trades
  }
}
`
const snxClient = new ApolloClient({
  uri:
    'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanger',
  cache: new InMemoryCache(),
})

const blocksQuery = (timestamp: Number) => `
{
  blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: {timestamp_gt: "${timestamp}"}) {
    id
    number
    timestamp
  }
}
`

const blocksClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
  cache: new InMemoryCache(),
})

const Home: NextPage = () => {
  const [partnersData, setPartnersData] = useState([])
  const [startBlockNumber, setStartBlockNumber] = useState(0)
  const [endBlockNumber, setEndBlockNumber] = useState(0)
  const [periodName, setPeriodName] = useState('')

  useEffect(() => {
    ;(async () => {
      const periodEnd = startOfMonth(new Date())
      const endBlockResult = await blocksClient.query({
        query: gql(blocksQuery(periodEnd.getTime() / 1000)),
      })
      const endBlock = endBlockResult.data.blocks[0].number

      const periodStart = subMonths(periodEnd, 1)
      const startBlockResult = await blocksClient.query({
        query: gql(blocksQuery(periodStart.getTime() / 1000)),
      })
      const startBlock = startBlockResult.data.blocks[0].number

      const startPartnersResult = await snxClient.query({
        query: gql(snxQuery(startBlock)),
      })
      const endPartnersResult = await snxClient.query({
        query: gql(snxQuery(endBlock)),
      })
      setPeriodName(format(periodStart, 'MMMM y'))
      setStartBlockNumber(startBlock)
      setEndBlockNumber(endBlock)
      processData(startPartnersResult, endPartnersResult)
    })()
  }, [])

  const processData = (startPartnersResult, endPartnersResult) => {
    let result = endPartnersResult.data.exchangePartners
      .map((p1) => {
        const startResultMatch = startPartnersResult.data.exchangePartners.filter(
          (p2) => {
            return p1.id === p2.id
          },
        )

        const feesAtStart = startResultMatch.length
          ? startResultMatch[0].usdFees
          : 0

        return {
          id: p1.id,
          fees: p1.usdFees - feesAtStart,
        }
      })
      .filter((p) => p.fees > 0)

    const totalFees = result.reduce((acc, p) => {
      return acc + p.fees
    }, 0)

    result = result
      .map((r) => {
        r.percentage = r.fees / totalFees
        r.payout = 10000 * r.percentage
        return r
      })
      .sort((a, b) => {
        return b.percentage > a.percentage ? 1 : -1
      })

    setPartnersData(result)
  }

  const queueActions = () => {
    alert('Coming soon')
  }

  return (
    <div>
      <Head>
        <title>Exchange Partners Payout Tool</title>
      </Head>
      <Container>
        <Heading as="h1" size="xl" mt={10} mb={6}>
          Exchange Partners Payout Tool
        </Heading>
        <Box
          d="inline-block"
          borderRadius="md"
          background="gray.900"
          py={5}
          px={6}
          mb={4}
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
            <Text d="inline" fontWeight="medium">
              Blocks:{' '}
            </Text>
            <Link
              href={`https://etherscan.io/block/${startBlockNumber}`}
              isExternal
            >
              {startBlockNumber}
            </Link>{' '}
            <ArrowForwardIcon transform="translateY(-1.5px)" />{' '}
            <Link
              href={`https://etherscan.io/block/${endBlockNumber}`}
              isExternal
            >
              {endBlockNumber}
            </Link>
          </Text>
        </Box>
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
                <Tr>
                  <Td fontWeight="bold">{partner.id}</Td>
                  <Td>
                    {partner.fees}
                    <Text d="block" fontSize="xs" fontWeight="semibold">
                      {partner.percentage * 100}%
                    </Text>
                  </Td>
                  <Td isNumeric>{partner.payout}</Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>

        <Button
          background="#00d1ff"
          width="100%"
          _hover={{ background: '#58e1ff' }}
          color="white"
          onClick={queueActions}
          mb={8}
          size="lg"
        >
          Queue Payouts
        </Button>
      </Container>
    </div>
  )
}

export default Home
