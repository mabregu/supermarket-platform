# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the **saver**: the price-conscious shopper (typically a household) whose job is to buy groceries at the lowest possible cost. Situation: standing in or heading to a supermarket, holding (or planning) a basket, and wanting to know where and what to buy to maximize savings. Job-to-be-done: compare real prices across nearby supermarkets for the same basket and choose the cheapest / best-priced option.

## Product Purpose

PreciosSmart is a supermarket price comparison and smart-cart product. It exists so a saver can act on real, official prices instead of sticker-guessing or stale data. Success for the first version: a user can search a product, see real SEPA prices alongside list price and promotions, pick the best deal, and optimize a cart.

## Positioning

Real SEPA-sourced prices — with list price vs. promotion and source provenance — a data mechanism and transparency model a general price-comparison product could not truthfully copy at the same fidelity.

## Capabilities and Constraints

Confirmed functionality: product search with best-deal resolution (listPrice, hasPromotion), per-branch prices, price history with source/sourceDate, evidence submission, scheduled SEPA ingestion, SEPA error detection, nearby stores via PostGIS ST_DWithin, AI smart cart optimization.

Durable constraints / facts confirmed by the user:
- SEPA ("Precios Claros") is the **official price source**.
- Read endpoints are **public** (User-Agent required).
- Contained delivery context.

Technical constraints: Postgres (Neon) + PostGIS; no auth in current scope (roadmap).

Explicitly undecided: auth model, additional price sources beyond SEPA, delivery/basket capabilities, pricing/UX of the smart cart.

## Evidence on Hand

Real SEPA prices captured: leche Casanto (EAN 7790742192301) → $1.940; aceite Canuelas (EAN 7792180001665) → $6.529; Coca-Cola (EAN 7790895007217) → $5.250.

Database state: SEPA snapshot seeded 3 products / 11 branches / 23 prices; subsequent ingestion stored 1.141 prices and 300 price-history rows.

## Product Principles

1. Real data beats estimates.
2. Transparency over cleverness: always show list price vs. promotion.
3. Saver-first value: the cheapest correct answer is the goal.

## Accessibility & Inclusion

No product-specific accessibility requirement established yet.
