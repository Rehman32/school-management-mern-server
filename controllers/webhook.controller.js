const Fee = require('../models/fee.model');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

// Stripe webhook handler
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body, // rawBody middleware required for Stripe
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event types
  if (
    event.type === 'payment_intent.succeeded' ||
    event.type === 'checkout.session.completed'
  ) {
    const data = event.data.object;
    // You may need to map payment to Fee by metadata or reference
    const studentId = data.metadata?.studentId;
    const schoolId = data.metadata?.schoolId;
    const amount = data.amount_received ? data.amount_received / 100 : data.amount_total / 100;
    const providerReference = data.id || data.payment_intent || data.session_id;
    const method = data.payment_method_types ? data.payment_method_types[0] : 'stripe';
    if (studentId && schoolId && amount) {
      // Find the most recent pending/partial Fee for this student
      const fee = await Fee.findOne({
        studentId,
        schoolId,
        status: { $in: ['pending', 'partial'] },
      }).sort({ dueDate: 1 });
      if (fee) {
        // Add payment record
        fee.paymentRecords.push({
          amount,
          date: new Date(),
          method,
          providerReference,
        });
        // Update status
        const totalPaid = fee.paymentRecords.reduce((sum, r) => sum + r.amount, 0);
        if (totalPaid >= fee.amount) {
          fee.status = 'paid';
        } else if (totalPaid > 0) {
          fee.status = 'partial';
        }
        await fee.save();
      }
    }
  }
  res.status(200).json({ received: true });
};
