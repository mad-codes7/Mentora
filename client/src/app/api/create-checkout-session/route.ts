import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
    try {
        const { amount, topic, sessionId } = await req.json();

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Mentora Session: ${topic || 'General'}`,
                            description: `1-on-1 tutoring session`,
                        },
                        unit_amount: Math.round(amount * 100), // paise
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.nextUrl.origin}/payment?sessionId=${sessionId}&status=success`,
            cancel_url: `${req.nextUrl.origin}/payment?sessionId=${sessionId}&status=cancelled`,
            metadata: {
                sessionId: sessionId,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}
