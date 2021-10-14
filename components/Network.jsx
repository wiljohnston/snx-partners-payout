import { useEffect, useState } from "react"
import { Badge } from "@chakra-ui/react"
import { ethers } from 'ethers'

const Connect = () => {

  const [network, setNetwork] = useState('')
    
  useEffect(()=>{
    // The "any" network will allow spontaneous network changes
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    provider.on("network", (newNetwork, oldNetwork) => {
        const networkName = newNetwork.name == 'homestead' ? 'mainnet' : newNetwork.name
        setNetwork(networkName)
    });
    })

      return (network && 
            <Badge
            position="fixed"
            top={4}
            right={4}
            colorScheme={network == "mainnet" ? "blue" : "red"}
          >
            {network}
          </Badge>
      )}
  
export default Connect