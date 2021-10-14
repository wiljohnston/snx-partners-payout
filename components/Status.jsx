import {
  Heading,
  Text,
  Box,
} from '@chakra-ui/react'
import { InfoOutlineIcon } from '@chakra-ui/icons'

const Status = ({status}) => {
    
    return (
          <Box
          borderRadius="md"
          background="gray.900"
          py={5}
          px={6}
          d="inline-block"
          mb={5}
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
    )}

export default Status