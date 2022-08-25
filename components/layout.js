import { useRecoilValue } from "recoil";
import { loadedGraph, loadedConversion, loadedHistorical } from "../store";
import theme from "../styles/theme";
import {
    Text,
    Box,
    Spinner,
} from "@chakra-ui/react";

export default function Layout({ children }) {

    let loading = false

    const hasMetaMask = typeof web3 !== "undefined";
    if (hasMetaMask) {
        const loaded1 = useRecoilValue(loadedGraph)
        const loaded2 = useRecoilValue(loadedConversion);
        loading = !(loaded1 && loaded2)
    } else {
        loading = false
    }

    return (
        <>
            {loading && (
                <Box
                    position="fixed"
                    w="100%"
                    h="100%"
                    top="0"
                    zIndex={100}
                    background={theme.colors.gray[800]}
                    d="flex"
                >
                    <Spinner m="auto" size="xl" />
                </Box>
            )}
            {!hasMetaMask ? (
                <Box
                    position="fixed"
                    w="100%"
                    h="100%"
                    top="0"
                    background={theme.colors.gray[800]}
                    d="flex"
                    zIndex={99}
                >
                    <Text m="auto" fontWeight="bold" fontSize="3xl">
                        Install MetaMask
                    </Text>
                </Box>
            ) : (
                <>{children}</>
            )}
        </>
    )
}



