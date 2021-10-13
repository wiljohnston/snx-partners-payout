import {
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react'

const PartnersTable = ({partnersData}) => {
  return (
        <Table variant="simple" mb={8}>
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
  )
}

export default PartnersTable
