import { Router } from "express";
import { addToBook } from "../orderBook/addToBook.js";
import { fillOrder } from "../orderBook/fillOrder.js";
import { getDepth } from "../orderBook/getDepth.js";
// import { getSortedBook, orderBook } from "../orderBook/orderBook.js";
import { orderInputSchema } from "../types/orderSchema.js";

const router = Router();

const userID = "random"; //get this from  Cookie or JWT

router.post("/", (req, res) => {
  const parsedOrder = orderInputSchema.safeParse(req.body);
  if (!parsedOrder.success) {
    return res.status(400).json({
      error: "Invalid order Input",
      details: parsedOrder.error,
    });
  }
  const order = parsedOrder.data;

  const remainingQty = fillOrder(order, userID);
  const filledQty = order.quantity - remainingQty;

  //Liquidity available and order gets filled
  if (remainingQty === 0) {
    return res.status(200).json({
      status: "filled",
      filledQty,
    });
  }
  //If its a market order and no liquidity available
  else if (remainingQty !== 0 && order.executionType == "ioc") {
    return res.status(200).json({
      status: "Partillay Filled",
      filledQty,
      remainingQty,
    });
  }
  // Limit order not completely filled
  else {
    const { side, price, quantity } = order;
    const newOrder = addToBook({ side, price, quantity }, userID);
    return res.status(201).json({
      status: "open",
      filledQty,
      remainingQty,
      order: newOrder,
    });
  }
});

router.get("/status", (req, res) => {
  //Orer Status Here
});

router.get("/depth", (req, res) => {
  res.json({ depth: getDepth() }).status(200);
});

router.post("/quote", (req, res) => {
  //Get Price Qute for Market Order Status Here
});

// router.get("/book", (req, res) => {
//   let asks = getSortedBook(orderBook.asks, true);
//   let bids = getSortedBook(orderBook.bids, false);
//   res.status(200).json({ asks, bids });
// });

// router.delete("/:id", (req, res) => {
//   cancelOrder(req.params.id);
//   res.json({ status: "cancelled" });
// });

export default router;
