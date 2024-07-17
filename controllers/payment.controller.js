import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createCustomer = async (req, res) => {
  try {
    const { email, firstName } = req.user;

    const existingCustomer = await stripe.customers.list({
      email: email,
    });

    if (existingCustomer.data.length) {
      return res.status(400).json({ message: "Customer already exists" });
    }

    const customer = await stripe.customers.create({
      email: email,
      name: firstName,
    });

    console.log("customer", customer);

    return res.status(201).json({ message: "Customer created", customer });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Customer not created" });
  }
};

const addCard = async (req, res) => {
  try {
    const { cardToken } = req.body;
    const { email } = req.user;

    const customer = await stripe.customers.list({
      email: email,
    });

    const card = await stripe.customers.createSource(customer.data[0].id, {
      source: cardToken,
    });

    return res.status(201).json({ message: "Card added", card });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Card not added" });
  }
};

const chargeCard = async (req, res) => {
  try {
    const { amount, currency, cardId } = req.body;

    const payment = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method: cardId,
      confirm: true,
    });

    return res.status(201).json({ message: "Payment successful", payment });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Payment not successful" });
  }
};

export { createCustomer, addCard, chargeCard };
