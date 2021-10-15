import { useEffect } from "react";
import Head from "next/head";

import {
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";

import Network from "../components/Network";
import Partners from "../components/Partners";
import DaoMembers from "../components/DaoMembers";
import CoreContributors from "../components/CoreContributors";

import { ethers } from "ethers";

function refreshOnNetworkChange() {
  // The "any" network will allow spontaneous network changes
  const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  provider.on("network", (newNetwork, oldNetwork) => {
    // When a Provider makes its initial connection, it emits a "network"
    // event with a null oldNetwork along with the newNetwork. So, if the
    // oldNetwork exists, it represents a changing network
    if (oldNetwork) {
      window.location.reload();
    }
  });
}

const Home = () => {
  useEffect(() => {
    refreshOnNetworkChange();
  }, []);

  return (
    <div>
      <Head>
        <title>SNX Payout Tool</title>
      </Head>
      <Network />
      <Container>
        <Heading
          textTransform="uppercase"
          letterSpacing={3}
          fontFamily="GT America"
          fontWeight={700}
          as="h1"
          size="xl"
          mt={10}
          mb={6}
          textAlign="center"
        >
          SNX Payout Tool
        </Heading>

        <Tabs isFitted>
          <TabList>
            <Tab fontWeight={600}>Partners</Tab>
            <Tab fontWeight={600}>DAO Members</Tab>
            <Tab fontWeight={600}>Core Contributors</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <Partners />
            </TabPanel>
            <TabPanel px={0}>
              <DaoMembers />
            </TabPanel>
            <TabPanel px={0}>
              <CoreContributors />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </div>
  );
};

export default Home;
