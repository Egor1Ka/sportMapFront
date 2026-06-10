'use client'

import dynamic from 'next/dynamic'

const Demo = dynamic(
	() => import('@/components/demo').then((mod) => mod.Demo),
	{ ssr: false },
)

export default function DemoPage() {
	return <Demo />
}
