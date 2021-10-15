import type { AppProps } from 'next/app'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import Fonts from '../components/fonts'
import theme from '../styles/theme'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Fonts />
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Component {...pageProps} />
    </ChakraProvider>
  )
}
export default MyApp
