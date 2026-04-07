import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import Card from '../common/Card'

export default function DocumentChart({ documents = {} }) {
  const yAxisWidth = 32

  const chartData = [
    { name: 'Receipts', value: documents.receipts || 0 },
    { name: 'Deliveries', value: documents.deliveries || 0 },
    { name: 'Transfers', value: documents.internal_transfers || 0 },
    { name: 'Adjustments', value: documents.adjustments || 0 },
  ]

  return (
    <Card
      title="Document Volume"
      description="Overview of inventory document activity across modules."
      className="h-full"
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: yAxisWidth, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#d6dfec" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              padding={{ left: 14, right: 14 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={yAxisWidth}
            />
            <Tooltip
              cursor={{ fill: 'rgba(44, 127, 255, 0.08)' }}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #d6dfec',
              }}
            />
            <Bar dataKey="value" fill="#2c7fff" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}