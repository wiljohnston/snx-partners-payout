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
  useToast,
  Grid,
} from '@chakra-ui/react'
import { ArrowForwardIcon, TimeIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ethers } from 'ethers'
import SafeBatchSubmitter from '../lib/SafeBatchSubmitter.js'

const GNOSIS_SAFE_ADDRESS = '0xee8C74634fc1590Ab7510a655F53159524ed0aC5'
const SNX_TOKEN_ADDRESS = '0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c'
const PARTNER_ADDRESSES = {
  CURVE: '0x07Aeeb7E544A070a2553e142828fb30c214a1F86',
  DHEDGE: '0x07Aeeb7E544A070a2553e142828fb30c214a1F86',
  '1INCH': '0x07Aeeb7E544A070a2553e142828fb30c214a1F86',
  ENZYME: '0x07Aeeb7E544A070a2553e142828fb30c214a1F86',
  SADDLE: '0x07Aeeb7E544A070a2553e142828fb30c214a1F86',
}

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
  blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: {timestamp_gte: "${timestamp}"}) {
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
  const [status, setStatus] = useState('none')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      const tz_offset = new Date().getTimezoneOffset() * 60 * 1000

      const periodEnd = startOfMonth(new Date())
      const endBlockResult = await blocksClient.query({
        query: gql(blocksQuery((periodEnd.getTime() - tz_offset) / 1000)),
      })
      const endBlock = endBlockResult.data.blocks[0].number

      const periodStart = subMonths(periodEnd, 1)
      const startBlockResult = await blocksClient.query({
        query: gql(blocksQuery((periodStart.getTime() - tz_offset) / 1000)),
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
      checkPaymentStatus()
    })()
  }, [])

  const processData = (startPartnersResult: any, endPartnersResult: any) => {
    let result = Object.keys(PARTNER_ADDRESSES).map((id) => {
      const periodStartData = startPartnersResult.data.exchangePartners.filter(
        (p: any) => p.id == id,
      )[0]
      const periodEndData = endPartnersResult.data.exchangePartners.filter(
        (p: any) => p.id == id,
      )[0]
      return {
        id: id,
        fees:
          periodEndData.usdFees -
          (periodStartData ? periodStartData.usdFees : 0),
      }
    })

    const totalFees = result.reduce((acc: number, p: any) => {
      return acc + p.fees
    }, 0)

    result = result
      .map((r: any) => {
        r.percentage = r.fees / totalFees
        r.payout = 10000 * r.percentage
        return r
      })
      .sort((a: any, b: any) => {
        return b.percentage > a.percentage ? 1 : -1
      })

    setPartnersData(result)
  }

  const queueActions = async () => {
    setLoading(true)

    const provider = new ethers.providers.Web3Provider((window as any).ethereum)
    let signer = provider.getSigner()
    ;(signer as any).address = await signer.getAddress()
    let network = await provider.getNetwork()
    const safeBatchSubmitter = new SafeBatchSubmitter({
      network: network.name,
      signer,
      safeAddress: GNOSIS_SAFE_ADDRESS,
    })
    await safeBatchSubmitter.init()
    const erc20Interface = new ethers.utils.Interface([
      'function transfer(address recipient, uint256 amount)',
    ])

    for (let index = 0; index < partnersData.length; index++) {
      const partner = partnersData[index]
      if (partner.payout > 0) {
        const data = erc20Interface.encodeFunctionData('transfer', [
          PARTNER_ADDRESSES[partner.id],
          ethers.utils.parseEther(partner.payout.toString()),
        ])
        await safeBatchSubmitter.appendTransaction({
          to: SNX_TOKEN_ADDRESS,
          data,
          force: false,
        })
      }
    }

    try {
      const submitResult = await safeBatchSubmitter.submit()
      toast({
        title: 'Transactions Queued',
        description: `You’ve successfully queued ${submitResult.transactions.length} transactions in the Gnosis Safe.`,
        status: 'success',
        isClosable: true,
      })
    } catch {
      toast({
        title: 'Error',
        description: `Something went wrong when attempting to queue these transactions.`,
        status: 'error',
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    const provider = new ethers.providers.Web3Provider((window as any).ethereum)
    let signer = provider.getSigner()
    ;(signer as any).address = await signer.getAddress()
    let network = await provider.getNetwork()
    const safeBatchSubmitter = new SafeBatchSubmitter({
      network: network.name,
      signer,
      safeAddress: GNOSIS_SAFE_ADDRESS,
    })
    await safeBatchSubmitter.init()

    let newStatus = 'none'
    try {
      // Check if there's a queued transaction with the same addresses to payout.
      const pendingTxns = await safeBatchSubmitter.service.getPendingTransactions(
        GNOSIS_SAFE_ADDRESS,
      )
      if (
        pendingTxns.results.some((t) => {
          const a = (t.dataDecoded as any).parameters[0].valueDecoded.map(
            (v) => v.dataDecoded.parameters[0].value,
          )
          const b = Object.values(PARTNER_ADDRESSES)
          return a.sort().join(',') === b.sort().join(',')
        })
      ) {
        newStatus = 'queued'
      }
    } finally {
      // Check if there's past transaction
      const endpoint =
        'https://api-rinkeby.etherscan.io/api?module=account&action=tokentx&contractaddress=0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c&address=0xee8C74634fc1590Ab7510a655F53159524ed0aC5&page=1&offset=10000&sort=desc'
      //const endpoint = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${SNX_TOKEN_ADDRESS}&address=${GNOSIS_SAFE_ADDRESS}&page=1&offset=10000&sort=desc`

      const response = await fetch(endpoint)
      const data = await response.json()
      if (
        data.result.some((r) => {
          return partnersData.some((p) => {
            return (
              r.value.toString() ==
                ethers.utils.parseEther(p.payout.toString()).toString() &&
              Object.values(PARTNER_ADDRESSES).includes(
                ethers.utils.getAddress(r.to),
              )
            )
          })
        })
      ) {
        newStatus = 'executed'
      }
    }

    setStatus(newStatus)
  }

  return (
    <div>
      <Head>
        <title>Exchange Partners Payout Tool</title>
      </Head>
      <Container>
        <Heading as="h1" size="xl" mt={10} mb={6} textAlign="center">
          Exchange Partners Payout Tool
        </Heading>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
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
              mb={2}
            >
              <InfoOutlineIcon transform="translateY(-1px)" mr={1.5} />
              Payout Status
            </Heading>
            {status == 'none' && (
              <Text>
                Based on past data, this payout probably hasn’t occured.
              </Text>
            )}
            {status == 'queued' && (
              <Text>
                Similar transactions are present in the Gnosis Safe queue.
              </Text>
            )}
            {status == 'executed' && (
              <Text>
                Similar transactions have been executed by the Gnosis Safe.
              </Text>
            )}
          </Box>
        </Grid>
        <Table variant="simple" mb={8}>
          <Thead>
            <Tr>
              <Th>Partner</Th>
              <Th>Fees Generated (USD)</Th>
              <Th isNumeric>Payout (SNX)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {partnersData.map((partner: any) => {
              return (
                <Tr key={partner.id}>
                  <Td fontWeight="bold">{partner.id}</Td>
                  <Td>
                    {partner.fees.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })}
                    <Text
                      d="block"
                      fontSize="xs"
                      opacity={0.66}
                      fontWeight="semibold"
                    >
                      {partner.percentage * 100}%
                    </Text>
                  </Td>
                  <Td isNumeric>
                    {partner.payout.toLocaleString('en-US', {
                      maximumFractionDigits: 20,
                    })}
                  </Td>
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
          isLoading={loading}
        >
          Queue Payouts
        </Button>
      </Container>
    </div>
  )
}

export default Home
