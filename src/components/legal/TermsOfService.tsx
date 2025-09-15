import React from "react";

import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export const TermsOfService: React.FC<Props> = ({ className }) => {
  return (
    <div className={cn("space-y-6 sm:space-y-8", className)}>
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Agreement to Terms
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            These Terms of Service ("Terms") govern your use of the Arguschain
            platform and services ("Service") operated by Arguschain Systems
            ("us," "we," or "our"). By accessing or using our Service, you agree
            to be bound by these Terms.
          </p>
          <p>
            If you disagree with any part of these terms, then you may not
            access the Service. These Terms apply to all visitors, users, and
            others who access or use the Service.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Service Description
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            Arguschain is an enterprise-grade Ethereum blockchain analysis
            platform that provides:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Transaction debugging and trace analysis</li>
            <li>Gas optimization insights and recommendations</li>
            <li>Smart contract analysis and security auditing</li>
            <li>Block-level transaction monitoring</li>
            <li>Event log analysis and filtering</li>
            <li>Bytecode analysis and storage inspection</li>
            <li>Performance monitoring and analytics</li>
          </ul>
          <p>
            We reserve the right to modify, suspend, or discontinue any part of
            the Service at any time with or without notice.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          User Accounts and Registration
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            To access certain features of the Service, you must create an
            account. When creating an account, you agree to:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your account information</li>
            <li>Keep your password secure and confidential</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized use</li>
          </ul>
          <p>
            You are responsible for safeguarding your account credentials and
            for all activities that occur under your account.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Acceptable Use Policy
        </h2>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-accent-primary mb-2 sm:mb-3">
              Permitted Uses
            </h3>
            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
              <p>You may use our Service for:</p>
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
                <li>Legitimate blockchain analysis and research</li>
                <li>Smart contract debugging and optimization</li>
                <li>Security auditing and compliance monitoring</li>
                <li>Educational and academic purposes</li>
                <li>Development and testing of blockchain applications</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-medium text-accent-primary mb-2 sm:mb-3">
              Prohibited Uses
            </h3>
            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit malicious code or conduct cyber attacks</li>
                <li>Attempt to gain unauthorized access to systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service for illegal financial activities</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Impersonate any person or entity</li>
                <li>Collect personal information without consent</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Intellectual Property Rights
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            The Service and its original content, features, and functionality
            are and will remain the exclusive property of Arguschain Systems and
            its licensors. The Service is protected by copyright, trademark, and
            other laws.
          </p>
          <p>
            Our trademarks and trade dress may not be used in connection with
            any product or service without our prior written consent. You may
            not modify, reproduce, distribute, or create derivative works based
            on the Service.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          User-Generated Content
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            Our Service may allow you to post, link, store, share and otherwise
            make available certain information, text, graphics, or other
            material ("Content"). You are responsible for the Content you post
            and agree that:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>You own or have the right to use the Content</li>
            <li>Your Content does not violate these Terms</li>
            <li>Your Content does not infringe on third-party rights</li>
            <li>
              You grant us a license to use your Content as necessary to provide
              the Service
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Privacy and Data Protection
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            Your privacy is important to us. Please review our Privacy Policy,
            which also governs your use of the Service, to understand our
            practices regarding the collection and use of your information.
          </p>
          <p>
            By using our Service, you acknowledge that blockchain data is
            inherently public and that transaction analysis may involve
            processing publicly available blockchain information.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Service Availability and Performance
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            We strive to maintain high service availability but cannot guarantee
            uninterrupted access. The Service may be temporarily unavailable due
            to:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Scheduled maintenance and updates</li>
            <li>Technical difficulties or system failures</li>
            <li>Third-party service dependencies</li>
            <li>Network connectivity issues</li>
            <li>Force majeure events</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Fees and Payment Terms
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            Some features of the Service may require payment of fees. If you
            choose to use paid features:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Fees are charged in advance on a recurring basis</li>
            <li>All fees are non-refundable unless otherwise stated</li>
            <li>You authorize us to charge your payment method</li>
            <li>You are responsible for all taxes and fees</li>
            <li>We may change fees with 30 days' notice</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Disclaimers and Limitations
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
            WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR
            IMPLIED, INCLUDING:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Merchantability and fitness for a particular purpose</li>
            <li>Non-infringement of third-party rights</li>
            <li>Accuracy, completeness, or reliability of information</li>
            <li>Uninterrupted or error-free operation</li>
            <li>Security or freedom from viruses</li>
          </ul>
          <p>
            You use the Service at your own risk. We are not responsible for any
            decisions made based on information provided by the Service.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Limitation of Liability
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR
            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Loss of profits, data, or business opportunities</li>
            <li>Service interruptions or security breaches</li>
            <li>Errors in blockchain analysis or recommendations</li>
            <li>Third-party actions or content</li>
          </ul>
          <p>
            Our total liability shall not exceed the amount paid by you for the
            Service in the 12 months preceding the claim.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Indemnification
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            You agree to defend, indemnify, and hold harmless Arguschain Systems
            and its affiliates from and against any claims, damages,
            obligations, losses, liabilities, costs, or debt arising from:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Any Content you submit or transmit</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Termination
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            We may terminate or suspend your account and access to the Service
            immediately, without prior notice, for any reason, including:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Breach of these Terms</li>
            <li>Violation of applicable laws</li>
            <li>Fraudulent or harmful activity</li>
            <li>Extended periods of inactivity</li>
          </ul>
          <p>
            Upon termination, your right to use the Service will cease
            immediately. Provisions that should survive termination will remain
            in effect.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Governing Law and Dispute Resolution
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of [Jurisdiction], without regard to its conflict of law
            provisions. Any disputes arising under these Terms shall be resolved
            through binding arbitration in accordance with the rules of
            [Arbitration Organization].
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Changes to Terms
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            We reserve the right to modify or replace these Terms at any time.
            If a revision is material, we will provide at least 30 days' notice
            prior to any new terms taking effect. Material changes will be
            communicated through the Service or via email.
          </p>
          <p>
            Your continued use of the Service after changes become effective
            constitutes acceptance of the new Terms.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Contact Information
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            If you have any questions about these Terms of Service, please
            contact us:
          </p>
          <div className="bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <li>Email: legal@arguschain.com</li>
              <li>Address: [Company Address]</li>
              <li>Phone: [Phone Number]</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
