import React from "react";

import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { PrivacyPolicy as PrivacyPolicyContent } from "@/components/legal/PrivacyPolicy";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="January 15, 2025">
      <PrivacyPolicyContent />
    </LegalPageLayout>
  );
}
