# local_stripedispute — remove site access when a Stripe payment is disputed

WooCommerce (Stripe checkout) → Stripe sends `charge.dispute.*` webhooks to
`https://learn.cataxcourses.com/local/stripedispute/webhook.php`.

On `charge.dispute.created` the plugin verifies the Stripe signature, reads the charge with a restricted
API key, takes the buyer email from WooCommerce's charge metadata (`customer_email`, then billing/receipt/
customer email) and, if exactly one non-admin Moodle account has that email, suspends it and signs it out.
No match / several matches / admin → recorded for review, nobody suspended. Later dispute events only
update the status. Dashboard: Student tools → Payment disputes (Restore access). Full list: Site
administration → Reports → Stripe disputes.

Settings: Site administration → Plugins → Local plugins → Stripe dispute lockout
(webhook signing secret `whsec_...`, restricted key `rk_live_...` with Charges + Customers read).
