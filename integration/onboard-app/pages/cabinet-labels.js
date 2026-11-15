// Display labels only. Original compartment IDs remain unchanged in API requests.
export const compartmentLabel = id => String(id ?? '').replace(
  /^(L\d+)-(\d+)-(\d+)$/,
  (match, locker, row, bin) => Number(row) >= 1 && Number(row) <= 26
    ? `${locker}-${String.fromCharCode(64 + Number(row))}-${bin.padStart(2, '0')}`
    : match,
);
