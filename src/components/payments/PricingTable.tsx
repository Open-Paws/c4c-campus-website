/**
 * Pricing Table Component
 *
 * Displays subscription pricing tiers with features and CTA buttons
 */

import React, { useState, useEffect } from 'react';
import { loadStripe as _loadStripe } from '@stripe/stripe-js';

// Note: Stripe import retained for future checkout integration
void _loadStripe;

interface PricingTier {
  id: string;
  name: string;
  price: number | string;
  interval: 'month' | 'year' | null;
  priceId?: string;
  features: string[];
  cta: string;
  popular?: boolean;
  isEnterprise?: boolean;
}

const PricingTable: React.FC = () => {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    // Listen for billing interval changes from Astro page
    const handleIntervalChange = (event: any) => {
      setBillingInterval(event.detail);
    };

    window.addEventListener('billing-interval-change', handleIntervalChange);

    return () => {
      window.removeEventListener('billing-interval-change', handleIntervalChange);
    };
  }, []);

  const tiers: PricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: null,
      features: [
        'Access to free courses',
        'Community forum access',
        'Basic progress tracking',
        'Course certificates',
      ],
      cta: 'Get Started',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: billingInterval === 'monthly' ? 29 : 290,
      interval: billingInterval === 'monthly' ? 'month' : 'year',
      priceId:
        billingInterval === 'monthly'
          ? import.meta.env.PUBLIC_STRIPE_PRICE_PRO_MONTHLY
          : import.meta.env.PUBLIC_STRIPE_PRICE_PRO_YEARLY,
      popular: true,
      features: [
        'All free features',
        'Access to all premium courses',
        'Cohort-based learning',
        'Priority support',
        'Downloadable resources',
        'Advanced progress analytics',
        'Course certificates',
        billingInterval === 'yearly' ? '2 months free (17% discount)' : '',
      ].filter(Boolean),
      cta: 'Start Free Trial',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      interval: null,
      isEnterprise: true,
      features: [
        'All Pro features',
        'Custom cohort creation',
        'White-label option',
        'Dedicated account manager',
        'Custom integrations',
        'Team management (5+ seats)',
        'API access',
      ],
      cta: 'Contact Sales',
    },
  ];

  const handleCheckout = async (tier: PricingTier) => {
    if (tier.isEnterprise) {
      window.location.href = '/contact?subject=Enterprise Plan';
      return;
    }

    if (tier.id === 'free') {
      window.location.href = '/apply';
      return;
    }

    setLoading(tier.id);

    try {
      // Get user session token
      const token = localStorage.getItem('sb-access-token');

      if (!token) {
        window.location.href = '/login?redirect=/pricing';
        return;
      }

      // Create checkout session
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'subscription',
          priceId: tier.priceId,
          metadata: {
            planName: tier.name,
            billingInterval: tier.interval,
            trialDays: 14, // 14-day free trial
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to start checkout. Please try again.'
      );
      setLoading(null);
    }
  };

  return (
    <div className="pricing-table">
      {tiers.map((tier) => (
        <div
          key={tier.id}
          className={`pricing-card ${tier.popular ? 'popular' : ''}`}
        >
          {tier.popular && <div className="popular-badge">Most Popular</div>}

          <div className="card-header">
            <h3 className="plan-name">{tier.name}</h3>
            <div className="price-container">
              {typeof tier.price === 'number' ? (
                <>
                  <span className="currency">$</span>
                  <span className="price">{tier.price}</span>
                  {tier.interval && <span className="interval">/{tier.interval}</span>}
                </>
              ) : (
                <span className="price custom">{tier.price}</span>
              )}
            </div>
            {billingInterval === 'yearly' && tier.id === 'pro' && (
              <p className="billing-note">Billed annually at ${tier.price}</p>
            )}
          </div>

          <ul className="features-list">
            {tier.features.map((feature, index) => (
              <li key={index} className="feature-item">
                <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            className={`cta-button ${tier.popular ? 'primary' : 'secondary'}`}
            onClick={() => handleCheckout(tier)}
            disabled={loading === tier.id}
          >
            {loading === tier.id ? 'Loading...' : tier.cta}
          </button>
        </div>
      ))}

      <style>{`
        .pricing-table {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin: 2rem 0;
        }

        .pricing-card {
          background: white;
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          position: relative;
          transition: transform 0.3s, box-shadow 0.3s;
          display: flex;
          flex-direction: column;
        }

        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        .pricing-card.popular {
          border: 3px solid #3182ce;
          transform: scale(1.05);
        }

        .popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .card-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .plan-name {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 1rem;
        }

        .price-container {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.25rem;
        }

        .currency {
          font-size: 1.5rem;
          font-weight: 600;
          color: #4a5568;
        }

        .price {
          font-size: 3.5rem;
          font-weight: 800;
          color: #2d3748;
        }

        .price.custom {
          font-size: 2.5rem;
        }

        .interval {
          font-size: 1.125rem;
          color: #718096;
        }

        .billing-note {
          font-size: 0.875rem;
          color: #718096;
          margin-top: 0.5rem;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0 0 2rem 0;
          flex-grow: 1;
        }

        .feature-item {
          display: flex;
          align-items: start;
          gap: 0.75rem;
          padding: 0.75rem 0;
          color: #4a5568;
        }

        .check-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #48bb78;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .cta-button {
          width: 100%;
          padding: 1rem 2rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }

        .cta-button.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .cta-button.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
        }

        .cta-button.secondary {
          background: white;
          color: #3182ce;
          border: 2px solid #3182ce;
        }

        .cta-button.secondary:hover:not(:disabled) {
          background: #3182ce;
          color: white;
        }

        .cta-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .pricing-table {
            grid-template-columns: 1fr;
          }

          .pricing-card.popular {
            transform: scale(1);
          }

          .price {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PricingTable;
