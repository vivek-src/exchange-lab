// Requests (API → Engine)

export const CREATE_ORDER = "CREATE_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const GET_DEPTH = "GET_DEPTH";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";

// Engine → API responses

export const DEPTH = "DEPTH";
export const ORDER_PLACED = "ORDER_PLACED";
export const ORDER_CANCELLED = "ORDER_CANCELLED";
export const OPEN_ORDERS = "OPEN_ORDERS";

// Engine → WS events

export const TRADE_ADDED = "TRADE_ADDED";
export const ORDER_UPDATE = "ORDER_UPDATE";
export const TICKER_UPDATE = "TICKER_UPDATE";
export const DEPTH_UPDATE = "DEPTH_UPDATE";
