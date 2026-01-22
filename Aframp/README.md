# 🌍 AFRAMP: Africa's Financial Bridge

## Don't Trust, Verify

AFRAMP is a blockchain payment platform designed specifically for the African market, enabling seamless conversion between local currencies and digital assets. We specialize in **onramp** (fiat-to-crypto) and **offramp** (crypto-to-fiat) transactions using African stablecoins and provide essential services like bill payments.

Built on the **Stellar network** with multi-chain compatibility, AFRAMP connects traditional African financial systems (like mobile money and local banks) to global blockchain ecosystems. Our platform tackles the high costs and slow speeds of cross-border payments by leveraging blockchain for near-instant, low-fee settlements.

### Who It's For
*   **African Users & Diaspora**: Send remittances, pay bills, and manage finances with minimal fees.
*   **Businesses & Developers**: Integrate pan-African payments and treasury solutions.
*   **Contributors**: Help build the future of African fintech with open, verifiable systems.

---

## 🏗️ Project Structure

The AFRAMP frontend repository is organized for clarity and scalability:

```
Aframp/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images, fonts, icons
│   ├── components/        # Reusable UI components (Buttons, Modals, etc.)
│   ├── contexts/          # React contexts (Auth, Wallet, Theme)
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Top-level page components (Dashboard, Onramp, Bills)
│   ├── services/          # API and blockchain service integrations
│   ├── styles/            # Global and module CSS/Tailwind config
│   ├── utils/             # Helper functions and constants
│   └── App.js             # Main application component
├── .env.example           # Environment variables template
├── package.json
└── README.md
```

---

## 🚀 Development Setup

Follow these instructions to get a local copy of the AFRAMP frontend up and running.

### Prerequisites
Ensure you have the following installed on your system:
*   **Node.js** (v18 or higher) & **npm**
*   **Git**
*   A modern web browser
*   (Recommended) A Stellar wallet browser extension (like Freighter)

### Installation & Running
1.  **Clone the repository and install dependencies:**
    ```bash
    git clone https://github.com/your-org/Aframp.git
    cd Aframp
    npm install
    ```

2.  **Configure environment variables:**
    ```bash
    cp .env.example .env.local
    ```
    Edit the `.env` file to set your configuration, such as the backend API URL and Stellar network (Testnet/Mainnet).

3.  **Start the development server:**
    ```bash
    npm start
    ```
    The application will open at `http://localhost:3000`.

4.  **Connect to the Backend:**
    The frontend is designed to work with the AFRAMP backend services, which handle blockchain interactions, user KYC, and transaction processing. Ensure the backend services are running and the `REACT_APP_API_URL` in your environment points to the correct location.

---

## 🧪 Testing & Quality

*   **Run Unit Tests:** Execute `npm test` to launch the test runner.
*   **Code Linting:** Use `npm run lint` to check code style and catch errors.
*   **Build for Production:** Run `npm run build` to create an optimized production build in the `build/` folder.

---

## 🤝 How to Contribute

We welcome contributions from the community! To ensure a smooth process, please follow these guidelines.

### Contribution Workflow
1.  **Fork the Repository**: Start by forking the main AFRAMP repository to your own GitHub account.
2.  **Create a Feature Branch**: In your fork, create a new branch for your work (e.g., `feat/add-new-component` or `fix/transaction-bug`).
3.  **Implement Your Changes**: Write clear, well-commented code. Ensure your changes align with the project's architecture, which integrates with Stellar's ecosystem protocols (SEPs) for ramps and authentication.
4.  **Test Thoroughly**: Verify your changes work correctly and don't break existing functionality.
5.  **Submit a Pull Request (PR)**: Push your branch to your fork and open a PR against the main repository's `develop` or `main` branch. Clearly describe the problem and your solution.

### Pull Request Requirements
*   **Title & Description**: Use a clear title and provide a detailed description of the changes.
*   **Linked Issue**: Reference any related GitHub issue.
*   **Code Quality**: Code must pass linting checks and existing tests.
*   **Screenshots**: For UI changes, include before/after screenshots or screen recordings.

### Community & Conduct
We strive to maintain a respectful and inclusive environment. Please be constructive in discussions and reviews. Major feature proposals are best discussed by opening an issue first.

---

## 📚 Helpful Links & Resources

*   **Stellar Documentation**: The foundation of our platform.
    *   [Stellar Ecosystem Proposals (SEPs)](#)
    *   [Anchor Platform Guide](#)
*   **AFRAMP Backend Repository**: [Link to backend service repo]
*   **Live Application**: [https://app.aframp.com](https://aframp.vercel.app/)
*   **Verification Portal**: [https://verify.aframp.com](#) *(Live transaction explorer)*
*   **Open an Issue**: Use GitHub Issues to report bugs or request features.

---

## 📄 License

This project is licensed under the **Apache 2.0 License**. By contributing, you agree that your contributions will be licensed under the same license.

---
*Built for Africa, Verified by Blockchain. Onramp to the future. Offramp to opportunity.* 🔗🌍
