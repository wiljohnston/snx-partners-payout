import { useEffect, useState } from 'react'
import Head from 'next/head'

import { Container, Heading, Button, useToast, Grid } from '@chakra-ui/react'

import PartnersTable from '../components/PartnersTable'
import Period from '../components/Period'
import Status from '../components/Status'

import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ethers } from 'ethers'
import SafeBatchSubmitter from '../lib/SafeBatchSubmitter.js'

import {
  GNOSIS_SAFE_ADDRESS,
  SNX_TOKEN_ADDRESS,
  PARTNER_ADDRESSES,
  SNX_TOTAL_DISTRIBUTION
} from '../config.js'

const snxQuery = (blockNumber) => `
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

const blocksQuery = (timestamp) => `
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

async function generateSafeBatchSubmitter(){
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  let signer = provider.getSigner()
  signer.address = await signer.getAddress()
  let network = await provider.getNetwork()
  const safeBatchSubmitter = new SafeBatchSubmitter({
    network: network.name,
    signer,
    safeAddress: GNOSIS_SAFE_ADDRESS,
  })
  await safeBatchSubmitter.init()
  return safeBatchSubmitter
}

const Home = () => {
  const [partnersData, setPartnersData] = useState([])
  const [startBlockNumber, setStartBlockNumber] = useState(0)
  const [endBlockNumber, setEndBlockNumber] = useState(0)
  const [periodName, setPeriodName] = useState('')
  const [status, setStatus] = useState('none')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      // Get block numbers corresponding to the start of this month and last month
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

      // Query partners data at these blocks
      const startPartnersResult = await snxClient.query({
        query: gql(snxQuery(startBlock)),
      })
      const endPartnersResult = await snxClient.query({
        query: gql(snxQuery(endBlock)),
      })

      // Set state accordingly
      setPeriodName(format(periodStart, 'MMMM y'))
      setStartBlockNumber(startBlock)
      setEndBlockNumber(endBlock)
      checkPaymentStatus()
      processData(startPartnersResult, endPartnersResult)
    })()
  }, [])

  const processData = (startPartnersResult, endPartnersResult) => {
    // Calculate fees for the period by taking the difference between the totals at start and end
    let result = Object.keys(PARTNER_ADDRESSES).map((id) => {
      const periodStartData = startPartnersResult.data.exchangePartners.filter(
        (p) => p.id == id,
      )[0]
      const periodEndData = endPartnersResult.data.exchangePartners.filter(
        (p) => p.id == id,
      )[0]
      return {
        id: id,
        fees:
          periodEndData.usdFees -
          (periodStartData ? periodStartData.usdFees : 0),
      }
    })

    // Calculate payout based on proportion of fees generated in the period
    const totalFees = result.reduce((acc, p) => {
      return acc + p.fees
    }, 0)
    result = result
      .map((r) => {
        r.percentage = r.fees / totalFees
        r.payout = SNX_TOTAL_DISTRIBUTION * r.percentage
        return r
      })
      .sort((a, b) => {
        return b.percentage > a.percentage ? 1 : -1
      })

    setPartnersData(result)
  }

  const queueActions = async () => {
    setLoading(true)

    // TODO: Confirm Safe has SNX_TOTAL_DISTRIBUTION available

    const safeBatchSubmitter = await generateSafeBatchSubmitter();
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
        description: submitResult.transactions.length ? `You’ve successfully queued ${submitResult.transactions.length} transactions in the Gnosis Safe.` : 'New transactions weren’t added. They are likely already awaiting execution in the Gnosis Safe.',
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
      checkPaymentStatus()
    }
  }

  const checkPaymentStatus = async () => {
    // TODO: Clean this up, add etherscan api key, make more reliable
    const safeBatchSubmitter = await generateSafeBatchSubmitter();

    let newStatus = 'none'
    try {
      // Check if there's a queued transaction with the same addresses to payout.
      const pendingTxns = await safeBatchSubmitter.service.getPendingTransactions(
        GNOSIS_SAFE_ADDRESS,
      )
      if (
        pendingTxns.results.some((t) => {
          const a = t.dataDecoded.parameters[0].valueDecoded.map(
            (v) => v.dataDecoded.parameters[0].value,
          )
          const b = Object.values(PARTNER_ADDRESSES)
          return a.sort().join(',') === b.sort().join(',')
        })
      ) {
        newStatus = 'queued'
      }
    } catch {}

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
