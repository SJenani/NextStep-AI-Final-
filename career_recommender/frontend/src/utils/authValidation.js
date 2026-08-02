const blockedEmailDomains = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "moakt.com",
  "tempmail.com",
  "temp-mail.org",
  "tempail.com",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
  "example.edu",
  "example.com",
  "example.net",
  "example.org",
  "localhost",
  "localdomain",
  "test.com",
  "fake.com",
  "invalid.com",
]);

const blockedLocalParts = new Set([
  "a",
  "aa",
  "abc",
  "admin",
  "demo",
  "email",
  "fake",
  "foo",
  "hello",
  "mail",
  "me",
  "no-reply",
  "noreply",
  "none",
  "sample",
  "test",
  "testing",
  "user",
]);

const suspiciousTerms = [
  "asdf",
  "dummy",
  "fake",
  "invalid",
  "qwerty",
  "sample",
  "test",
  "trash",
];

function hasValidDomainLabels(domain) {
  return domain.split(".").every((label) => {
    return (
      label.length >= 2 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    );
  });
}

export function validateRealEmail(email) {
  const normalized = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailPattern.test(normalized)) {
    return "Enter a valid email address.";
  }

  const [localPart, domain] = normalized.split("@");
  const domainParts = domain.split(".");
  const topLevelDomain = domainParts.at(-1) || "";

  if (!localPart || !domain || localPart.length < 2 || localPart.length > 64) {
    return "Enter a valid email address.";
  }

  if (
    normalized.includes("..") ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    !hasValidDomainLabels(domain) ||
    topLevelDomain.length < 2 ||
    topLevelDomain.length > 24
  ) {
    return "Enter a valid email address.";
  }

  if (
    blockedEmailDomains.has(domain) ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".test") ||
    domain.endsWith(".example") ||
    domain.endsWith(".localhost")
  ) {
    return "Use a real personal, school, or work email address.";
  }

  if (
    blockedLocalParts.has(localPart) ||
    suspiciousTerms.some((term) => localPart.includes(term) || domain.includes(term)) ||
    /^[0-9]+$/.test(localPart) ||
    /^[a-z]{1,2}[0-9]{5,}$/.test(localPart) ||
    /^([a-z0-9])\1{4,}$/.test(localPart.replace(/[._-]/g, ""))
  ) {
    return "This looks like a fake email address. Use a real email to continue.";
  }

  return null;
}
