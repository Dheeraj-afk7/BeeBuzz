<p align="center">
  <br>
  <img src="https://via.placeholder.com/150?text=BeeBuzz" alt="BeeBuzz Logo">
  <h1 align="center">BeeBuzz</h1>
  <p align="center">
    <strong>Digital Freight Matching Ecosystem</strong><br>
    Connecting "Flowers" (Shippers) with "Bees" (Drivers)
  </p>
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-brightgreen.svg)]()
[![Standard](https://img.shields.io/badge/Standard-IEEE%20830--1998-yellow.svg)]()

---

## 📖 About The Project

BeeBuzz is a standalone mobile and web application designed to disrupt the traditional, manual brokerage model in logistics. Born out of the need to organize India's trucking chaos, it replaces phone calls and WhatsApp group confusion with quick matching, live GPS tracking, and automated payments.

The platform facilitates the entire shipment lifecycle:
1.  **Posting:** Shippers post loads.
2.  **Bidding:** Drivers compete for the load.
3.  **Tracking:** Real-time GPS monitoring.
4.  **Delivery:** Proof of Delivery (POD) and automated escrow payments.

---

## 🐝 Key Features

### For Shippers ("Flowers")
*   **Load Management:** Post loads with detailed cargo specs, pickup/delivery locations, and truck requirements.
*   **Bidding System:** Review driver bids, ratings, and past performance; accept or reject offers.
*   **Real-Time Tracking:** View driver location on a map with ETA updates during transit.
*   **Proof of Delivery:** Review POD photos and signatures before confirming delivery.
*   **Payment History:** Manage invoices and view transaction history.

### For Drivers ("Bees")
*   **Load Discovery:** Browse available loads via Map or List view with filtering (location, payout, weight).
*   **Smart Bidding:** Place competitive bids and track status (Pending/Accepted/Rejected).
*   **Trip Execution:** One-tap status updates ("Arrived at Pickup", "Loaded", "Delivered").
*   **In-App Navigation:** Integration with Google/Apple Maps for pickup and delivery routing.
*   **Earnings:** Automated payouts held in escrow until delivery is confirmed.

### System Capabilities
*   **Escrow Security:** Funds are held securely until delivery is verified to protect both parties.
*   **Document Verification:** Automated and manual review of driver licenses and vehicle documents.
*   **Geo-Fencing:** Automatic status updates when drivers enter pickup/delivery zones.

---

## 🛠 Tech Stack

Based on the SRS architecture, the project utilizes the following technologies:

*   **Mobile App:** React Native (iOS 14+ / Android 10+)
*   **Backend:** Node.js
*   **Database:** PostgreSQL (Primary Data), MongoDB (Logs/Analytics)
*   **Cloud Infrastructure:** AWS (Mumbai Region - India Data Residency)
*   **Maps & Location:** Google Maps SDK
*   **Notifications:** Firebase Cloud Messaging (FCM) / Apple Push Notification Service (APNs)
*   **Security:** OAuth2, AES-256 Encryption, PCI-DSS Compliant Payment Handling

---

## 📂 Project Structure

A typical structure for the BeeBuzz monorepo:

```text
/BeeBuzz
├── /mobile-app            # React Native Application
│   ├── /src
│   │   ├── /components    # Reusable UI components
│   │   ├── /screens       # Shipper and Driver screens
│   │   ├── /services      # API and Location services
│   │   └── /utils         # Helpers and constants
│   ├── android/           # Android native config
│   └── ios/               # iOS native config
│
├── /backend               # Node.js API Server
│   ├── /src
│   │   ├── /controllers  # Request handling
│   │   ├── /models        # Database schemas
│   │   ├── /routes        # API Endpoints
│   │   └── /middleware    # Auth and Validation
│   └── tests/             # Backend unit tests
│
└── /docs                 # Design and SRS documents
