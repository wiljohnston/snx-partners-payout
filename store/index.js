import { atom } from "recoil";

export const loadedGraph = atom({
    key: 'loadedGraph',
    default: false,
});

export const loadedConversion = atom({
    key: 'loadedConversion',
    default: false,
});

export const loadedHistorical = atom({
    key: 'loadedHistorical',
    default: false,
});