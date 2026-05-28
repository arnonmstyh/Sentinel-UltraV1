// Types for the VPN access log feature.
// Source: Google Sheet VPN tab (gid=0), served normalized by /api/vpn-usage.

export type VpnOutcome = "success" | "failure" | "other";

export interface VpnAccessRecord {
  /** Stable id assigned by the server, e.g. "VPN-0001". */
  id: string;
  /** Connection time. Null when the source value could not be parsed. */
  timestamp: Date | null;
  /** Original "YYYY-MM-DD,HH:MM" value, preserved for debugging. */
  rawTime: string;
  /** Source IPv4 address. */
  srcIp: string;
  /** Raw username field (may contain brute-force junk on failed rows). */
  user: string;
  /** Username with brute-force junk stripped. */
  cleanUser: string;
  /** Geographic location (always "Thailand" in current data). */
  country: string;
  /** Raw status string from the sheet. */
  status: string;
  /** Classified connection outcome. */
  outcome: VpnOutcome;
  /** Raw response field (usually empty). */
  response: string;
  /** Advisory heuristic flag — a failed login with password-like junk in `user`. */
  isBruteForce: boolean;
}
