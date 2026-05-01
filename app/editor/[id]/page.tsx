import EditorEdit from './EditorEdit'

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditorEdit id={id} />
}
