import { ChakraProvider, ColorModeScript, Text } from "@chakra-ui/react";
import Fonts from "../components/Fonts";
import theme from "../styles/theme";

function MyApp({ Component, pageProps }) {
  const noMetaMask = typeof web3 == "undefined";

  return (
    <ChakraProvider>
      <Fonts />
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {noMetaMask ? (
        <Text textAlign="center" py={40} fontWeight="bold" fontSize="3xl">
          Install MetaMask!
        </Text>
      ) : (
        <Component {...pageProps} />
      )}
    </ChakraProvider>
  );
}
export default MyApp;
