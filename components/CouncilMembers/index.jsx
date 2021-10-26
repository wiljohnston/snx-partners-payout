import { useState } from "react";
import { Button, Box } from "@chakra-ui/react";

import { ethers } from "ethers";
import SafeBatchSubmitter from "../../lib/SafeBatchSubmitter.js";
import {
  GNOSIS_SAFE_ADDRESS,
  SNX_TOKEN_ADDRESS,
  SPARTAN_COUNCIL_NFT_ADDRESS,
  AMBASSADORS_COUNCIL_NFT_ADDRESS,
  GRANTS_COUNCIL_NFT_ADDRESS,
  TREASURY_COUNCIL_NFT_ADDRESS,
} from "../../config.js";
import Council from "./Council";

async function generateSafeBatchSubmitter() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  let signer = provider.getSigner();
  signer.address = await signer.getAddress();
  let network = await provider.getNetwork();
  const safeBatchSubmitter = new SafeBatchSubmitter({
    network: network.name,
    signer,
    safeAddress: GNOSIS_SAFE_ADDRESS,
  });
  await safeBatchSubmitter.init();
  return safeBatchSubmitter;
}

const CouncilMembers = () => {
  const [loading, setLoading] = useState(false);
  const queueActions = () => {};

  return (
    <Box py={4}>
      <Council
        name="Spartan Council"
        nftAddress={SPARTAN_COUNCIL_NFT_ADDRESS}
        stipend={1000}
      />
      <Council
        name="Treasury Council"
        nftAddress={TREASURY_COUNCIL_NFT_ADDRESS}
        stipend={500}
      />
      <Council
        name="Grants Council"
        nftAddress={GRANTS_COUNCIL_NFT_ADDRESS}
        stipend={500}
      />
      <Council
        name="Ambassador Council"
        nftAddress={AMBASSADORS_COUNCIL_NFT_ADDRESS}
        stipend={500}
      />
      <Button
        background="#00d1ff"
        width="100%"
        _hover={{ background: "#58e1ff" }}
        color="white"
        onClick={queueActions}
        my={6}
        size="lg"
        isLoading={loading}
        textTransform="uppercase"
        fontFamily="GT America"
        letterSpacing={1}
        fontWeight={400}
        disabled={true}
      >
        Queue Payouts
      </Button>
    </Box>
  );
};

export default CouncilMembers;
