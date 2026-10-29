'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, RotateCw, AlertTriangle } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

interface AllocatedChargeItem {
  chargeId: string;
  description: string;
  batchName: string;
  period: string | null;
  amount: string;
}

interface ReceiptData {
  receiptNumber: string;
  centerName: string;
  receiptHeader: string | null;
  receiptFooter: string | null;
  branch: {
    name: string;
    code: string;
    address: string | null;
  };
  student: {
    id: string;
    name: string;
    studentCode: string | null;
  };
  allocatedCharges: AllocatedChargeItem[];
  amount: string;
  method: string;
  reference: string | null;
  receivedBy: string;
  receivedAtDate: string;
  isReversed: boolean;
  remainingDues: string;
}

export default function ReceiptPrintPage({
  params,
}: {
  params: Promise<{ paymentId: string }> | { paymentId: string };
}) {
  const router = useRouter();
  const { center } = useCenter();

  // Resolve params
  const unwrappedParams = 'then' in params ? React.use(params) : params;
  const paymentId = unwrappedParams.paymentId;

  const [receipt, setReceipt] = React.useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = React.useState(0);

  const refetchReceipt = React.useCallback(() => {
    setIsLoading(true);
    setReloadTrigger((c) => c + 1);
  }, []);

  React.useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        const res = await apiGet<{ success: boolean; data: ReceiptData }>(
          `/api/fees/receipts/${paymentId}`
        );
        if (!ignore) {
          if (res?.success && res.data) {
            setReceipt(res.data);
            setError(null);
          } else {
            setError('Receipt not found or you lack permission to view it.');
          }
        }
      } catch {
        if (!ignore) {
          setError('Unable to load receipt. Please check connection.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [paymentId, reloadTrigger]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-sm text-muted-foreground">
        <RotateCw className="h-5 w-5 animate-spin text-primary" />
        Generating official receipt view...
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <ErrorState
          title="Receipt Unavailable"
          message={error || 'Could not find the requested receipt.'}
          onRetry={refetchReceipt}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 sm:py-8">
      {/* Top action bar (hidden in print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between px-4 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handlePrint}
          className="flex items-center gap-1.5"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      {/* Official Receipt Printable Container */}
      <div
        id="official-receipt"
        className="relative max-w-3xl mx-auto bg-surface rounded-[var(--radius-card)] border border-border p-8 shadow-sm print:shadow-none print:border-none print:p-0 print:max-w-full"
      >
        {/* REVERSED Watermark */}
        {receipt.isReversed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden opacity-15"
          >
            <div className="transform -rotate-45 text-7xl sm:text-9xl font-black uppercase text-status-danger-text tracking-widest border-8 border-status-danger-border p-6 rounded-2xl">
              REVERSED
            </div>
          </div>
        )}

        {/* Receipt Header */}
        <div className="border-b border-border pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              {center.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={center.logoUrl}
                  alt={receipt.centerName}
                  className="h-12 w-auto mb-2 object-contain"
                />
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {receipt.centerName}
              </h1>
              {receipt.receiptHeader && (
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
                  {receipt.receiptHeader}
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Branch: <span className="font-semibold text-foreground">{receipt.branch.name}</span>
                {receipt.branch.address && ` • ${receipt.branch.address}`}
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="inline-block rounded-[var(--radius-control)] bg-muted/60 px-3 py-1 font-mono text-xs font-bold text-foreground border border-border">
                RECEIPT #{receipt.receiptNumber}
              </div>
              <div className="text-xs text-muted-foreground">
                Date: <span className="font-semibold text-foreground">{receipt.receivedAtDate}</span>
              </div>
              {receipt.isReversed && (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-status-danger-text bg-status-danger-bg px-2 py-0.5 rounded border border-status-danger-border">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  TRANSACTION REVERSED
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Student Information Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-border text-sm">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Student Information
            </div>
            <div className="mt-1 font-bold text-foreground text-base">{receipt.student.name}</div>
            {receipt.student.studentCode && (
              <div className="text-xs text-muted-foreground font-mono">
                Student ID: {receipt.student.studentCode}
              </div>
            )}
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Payment Details
            </div>
            <div className="mt-1 font-semibold text-foreground">
              Method: {receipt.method}
            </div>
            {receipt.reference && (
              <div className="text-xs text-muted-foreground">
                Ref / TRX ID: {receipt.reference}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Collected By: {receipt.receivedBy}
            </div>
          </div>
        </div>

        {/* Allocated Charges Table */}
        <div className="py-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Settled Fees & Charges
          </div>
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Batch</th>
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {receipt.allocatedCharges.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground italic">
                    Unallocated deposit credited to student account
                  </td>
                </tr>
              ) : (
                receipt.allocatedCharges.map((ch, idx) => (
                  <tr key={idx} className="text-xs">
                    <td className="py-2.5 px-3 font-medium text-foreground">{ch.description}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{ch.batchName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{ch.period || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                      {formatMoney(ch.amount, center.currency, center.currencySymbol)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals & Balance Summary */}
        <div className="border-t border-border pt-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                Status: <span className="font-semibold text-foreground">{receipt.isReversed ? 'Reversed' : 'Paid & Confirmed'}</span>
              </div>
              <div>
                Remaining Student Dues After Payment:{' '}
                <span className="font-mono font-bold text-foreground">
                  {formatMoney(receipt.remainingDues, center.currency, center.currencySymbol)}
                </span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Total Amount Paid</div>
              <div
                className={`text-2xl sm:text-3xl font-mono font-bold ${
                  receipt.isReversed ? 'line-through text-status-danger-text' : 'text-foreground'
                }`}
              >
                {formatMoney(receipt.amount, center.currency, center.currencySymbol)}
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Footer */}
        {receipt.receiptFooter && (
          <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground whitespace-pre-line">
            {receipt.receiptFooter}
          </div>
        )}

        <div className="mt-6 flex justify-between items-end text-xs text-muted-foreground pt-4 border-t border-dashed border-border">
          <div>Printed automatically from EduFlow Ledger</div>
          <div className="text-center">
            <div className="border-b border-border w-36 mb-1"></div>
            Authorized Signature
          </div>
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header,
          nav,
          aside,
          .print\\:hidden {
            display: none !important;
          }
          #official-receipt {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          @page {
            size: A5 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
