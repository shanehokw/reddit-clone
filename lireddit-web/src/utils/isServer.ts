// we know when we're on the server when the window = undefined, if not on server, window will be active/defined
export const isServer = () => typeof window === "undefined";
