import React from 'react';
import { Empty, IconName, ListRow, Screen, Surface } from '../components/ui';
import { useStore } from '../data/store';
import type { PaymentKind } from '../data/types';
import { colors, space } from '../theme';
import { inr, shortDate } from '../utils/format';

const ICON: Record<PaymentKind, IconName> = {
  card: 'card-outline',
  bill: 'receipt-outline',
  challan: 'alert-circle-outline',
  fastag: 'pricetag-outline',
};

export default function ActivityScreen() {
  const { state } = useStore();
  const acct = (id?: string) => state.accounts.find((a) => a.id === id);

  if (state.payments.length === 0) {
    return (
      <Screen padTop={false}>
        <Empty icon="time-outline" text="No payments yet. Card bills, utility bills, challans and FASTag recharges you pay will show here." />
      </Screen>
    );
  }

  return (
    <Screen padTop={false}>
      <Surface style={{ paddingVertical: space(1) }}>
        {state.payments.map((p, i) => {
          const a = acct(p.fromAccountId);
          return (
            <ListRow
              key={p.id}
              icon={ICON[p.kind]}
              iconColor={colors.good}
              title={p.title}
              subtitle={`${shortDate(p.date)}${a ? `, from ${a.bank} ending ${a.last4}` : ''}`}
              right={`-${inr(p.amount)}`}
              last={i === state.payments.length - 1}
            />
          );
        })}
      </Surface>
    </Screen>
  );
}
