import React from "react";

import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { TermsOfService as TermsOfServiceContent } from "@/components/legal/TermsOfService";

export default function TermsOfService() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="January 15, 2025">
      <TermsOfServiceContent />
    </LegalPageLayout>
  );
}
