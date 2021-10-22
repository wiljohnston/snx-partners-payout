import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import Fonts from "../components/Fonts";
import Layout from "../components/layout";
import theme from "../styles/theme";
import { RecoilRoot } from "recoil";

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider>
      <RecoilRoot>
        <Fonts />
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </RecoilRoot>
    </ChakraProvider>
  );
}
export default MyApp;
