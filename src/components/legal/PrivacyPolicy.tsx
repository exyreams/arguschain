import React from "react";

import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export const PrivacyPolicy: React.FC<Props> = ({ className }) => {
  return (
    <div className={cn("space-y-6 sm:space-y-8", className)}>
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Introduction
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            At Arguschain ("we," "our," or "us"), we are committed to protecting
            your privacy and ensuring the security of your personal information.
            This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our blockchain analysis
            platform and related services.
          </p>
          <p>
            By using Arguschain, you consent to the data practices described in
            this policy. If you do not agree with the practices described in
            this policy, please do not use our services.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Information We Collect
        </h2>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-accent-primary mb-2 sm:mb-3">
              Personal Information
            </h3>
            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
              <p>We may collect the following personal information:</p>
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
                <li>Email address for account creation and communication</li>
                <li>Username and profile information</li>
                <li>Payment information for premium services</li>
                <li>Communication preferences and settings</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-medium text-accent-primary mb-2 sm:mb-3">
              Usage Information
            </h3>
            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
              <p>
                We automatically collect information about your use of our
                services:
              </p>
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
                <li>Transaction hashes and blockchain addresses you analyze</li>
                <li>Search queries and analysis parameters</li>
                <li>Usage patterns and feature interactions</li>
                <li>Device information and browser type</li>
                <li>IP address and location data</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          How We Use Your Information
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>We use the collected information for the following purposes:</p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Provide and maintain our blockchain analysis services</li>
            <li>Process transactions and manage your account</li>
            <li>Improve our platform and develop new features</li>
            <li>Send important updates and security notifications</li>
            <li>Provide customer support and respond to inquiries</li>
            <li>Analyze usage patterns to optimize performance</li>
            <li>Comply with legal obligations and prevent fraud</li>
            <li>Personalize your experience and recommendations</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Information Sharing and Disclosure
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            We do not sell, trade, or rent your personal information to third
            parties. We may share your information only in the following
            circumstances:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>With your explicit consent</li>
            <li>To comply with legal obligations or court orders</li>
            <li>To protect our rights, property, or safety</li>
            <li>With trusted service providers who assist in our operations</li>
            <li>In connection with a business transfer or acquisition</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Data Security
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            We implement industry-standard security measures to protect your
            information:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Secure data centers with physical security measures</li>
            <li>Employee training on data protection practices</li>
          </ul>
          <p>
            However, no method of transmission over the internet is 100% secure.
            While we strive to protect your information, we cannot guarantee
            absolute security.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Data Retention
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            We retain your information for as long as necessary to provide our
            services and comply with legal obligations:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Account information: Until account deletion</li>
            <li>Usage data: Up to 2 years for analytics purposes</li>
            <li>Transaction records: As required by applicable law</li>
            <li>Communication records: Up to 3 years</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Your Rights and Choices
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            You have the following rights regarding your personal information:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Access and review your personal information</li>
            <li>Correct inaccurate or incomplete information</li>
            <li>Delete your account and associated data</li>
            <li>Export your data in a portable format</li>
            <li>Opt-out of marketing communications</li>
            <li>Restrict or object to certain processing activities</li>
          </ul>
          <p>
            To exercise these rights, please contact us at
            privacy@arguschain.com or through your account settings.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Cookies and Tracking Technologies
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            We use cookies and similar technologies to enhance your experience:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Essential cookies for platform functionality</li>
            <li>Analytics cookies to understand usage patterns</li>
            <li>Preference cookies to remember your settings</li>
            <li>Security cookies to protect against fraud</li>
          </ul>
          <p>
            You can control cookie settings through your browser preferences.
            Disabling certain cookies may affect platform functionality.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          International Data Transfers
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            Your information may be transferred to and processed in countries
            other than your own. We ensure appropriate safeguards are in place
            to protect your information during international transfers,
            including:
          </p>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 ml-2 sm:ml-4">
            <li>Adequacy decisions by relevant authorities</li>
            <li>Standard contractual clauses</li>
            <li>Certification schemes and codes of conduct</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Children's Privacy
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            Our services are not intended for children under 13 years of age. We
            do not knowingly collect personal information from children under
            13. If we become aware that we have collected information from a
            child under 13, we will take steps to delete such information
            promptly.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Changes to This Privacy Policy
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by posting the new Privacy Policy on
            this page and updating the "Last updated" date. We encourage you to
            review this Privacy Policy periodically for any changes.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-accent-primary mb-3 sm:mb-4">
          Contact Us
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-text-secondary leading-relaxed">
          <p>
            If you have any questions about this Privacy Policy or our data
            practices, please contact us:
          </p>
          <div className="bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <li>Email: privacy@arguschain.com</li>
              <li>Address: [Company Address]</li>
              <li>Phone: [Phone Number]</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
