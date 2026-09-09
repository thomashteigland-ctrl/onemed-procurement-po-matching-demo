export type ArchitectureLayer =
  | 'sources'
  | 'middleware'
  | 'platform'
  | 'agents'
  | 'dashboard'

export type SourceGroup = 'external' | 'internal'

export type ArchitectureIcon = 'database' | 'mail' | 'bot' | 'user' | 'folder' | 'cable'

export interface ArchitectureNode {
  id: string
  layer: ArchitectureLayer
  group?: SourceGroup
  title: string
  subtitle: string
  icon: ArchitectureIcon
  gap?: boolean
}

export interface ArchitectureEdge {
  id: string
  from: string
  to: string
}

export type WorkflowStepId =
  | 'overview'
  | 'ingest'
  | 'archive'
  | 'verify'
  | 'write'
  | 'email-out'

export interface WorkflowStep {
  id: WorkflowStepId
  label: string
  caption: string
  nodeIds: string[]
  edgeIds: string[]
  triggerNodeIds: string[]
}

function e(from: string, to: string): ArchitectureEdge {
  return { id: `${from}__${to}`, from, to }
}

export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: 'vendor-db',
    layer: 'sources',
    group: 'external',
    title: 'Vendor database',
    subtitle: 'OC, ASN, DN, invoices, credit notes',
    icon: 'database',
  },
  {
    id: 'peppol',
    layer: 'sources',
    group: 'external',
    title: 'Peppol / EHF',
    subtitle: 'Structured e-invoices (Nordic)',
    icon: 'database',
  },
  {
    id: 'sap-ecc',
    layer: 'sources',
    group: 'internal',
    title: 'SAP ECC (Legacy)',
    subtitle: 'POs created here · source instance',
    icon: 'database',
  },
  {
    id: 'sap-s4',
    layer: 'sources',
    group: 'internal',
    title: 'SAP S/4HANA',
    subtitle: 'Migration target · dual running',
    icon: 'database',
  },
  {
    id: 'excel-pricing',
    layer: 'sources',
    group: 'internal',
    title: 'Excel Pricing',
    subtitle: 'Agreed unit prices & terms',
    icon: 'database',
  },
  {
    id: 'excel-shadow',
    layer: 'sources',
    group: 'internal',
    title: 'Excel Shadow ledger',
    subtitle: 'GRIR / match tracker',
    icon: 'database',
  },
  {
    id: 'vendor-excel',
    layer: 'sources',
    group: 'internal',
    title: 'Vendor master',
    subtitle: 'Excel list + SAP vendor',
    icon: 'database',
  },
  {
    id: 'outlook',
    layer: 'sources',
    group: 'internal',
    title: 'Outlook shared inbox',
    subtitle: 'inkop@onemed.com',
    icon: 'mail',
  },

  {
    id: 'graph-mail',
    layer: 'middleware',
    title: 'Microsoft Graph Mail',
    subtitle: 'Auth, inbox, send',
    icon: 'cable',
  },
  {
    id: 'graph-onedrive',
    layer: 'middleware',
    title: 'Microsoft Graph OneDrive',
    subtitle: 'File ingest & write',
    icon: 'cable',
  },
  {
    id: 'sap-adapter',
    layer: 'middleware',
    title: 'SAP Adapter',
    subtitle: 'BAPI / IDoc lookup & post',
    icon: 'cable',
  },
  {
    id: 'extract-etl',
    layer: 'middleware',
    title: 'Document extraction ETL',
    subtitle: 'Transform, validate, load',
    icon: 'cable',
  },
  {
    id: 'model-gateway',
    layer: 'middleware',
    title: 'Model Gateway',
    subtitle: 'LLM routing & fallback',
    icon: 'cable',
  },
  {
    id: 'mcp',
    layer: 'middleware',
    title: 'MCP Servers',
    subtitle: 'Tool registry & routing',
    icon: 'cable',
  },
  {
    id: 'event-bus',
    layer: 'middleware',
    title: 'Event Bus / Streaming',
    subtitle: 'MISSING: No real-time infra',
    icon: 'cable',
    gap: true,
  },
  {
    id: 'unified-mdm',
    layer: 'middleware',
    title: 'Unified PO / Vendor Master',
    subtitle: 'MISSING: No single MDM',
    icon: 'cable',
    gap: true,
  },

  {
    id: 'onedrive',
    layer: 'platform',
    title: 'OneDrive document archive',
    subtitle: 'Unstructured system of record',
    icon: 'folder',
  },
  {
    id: 'structured-store',
    layer: 'platform',
    title: 'Extracted document store',
    subtitle: 'PO, OC, ASN, DN, Invoice, Credit note',
    icon: 'database',
  },
  {
    id: 'vector-store',
    layer: 'platform',
    title: 'Vector Store (RAG)',
    subtitle: 'Unstructured docs & search',
    icon: 'database',
  },
  {
    id: 'match-store',
    layer: 'platform',
    title: 'Match & exception store',
    subtitle: 'Discrepancies, flags, stages',
    icon: 'database',
  },
  {
    id: 'data-quality',
    layer: 'platform',
    title: 'Data Quality Monitor',
    subtitle: 'MISSING: No automated QA',
    icon: 'database',
    gap: true,
  },

  {
    id: 'inbox-agent',
    layer: 'agents',
    title: 'Inbox ingest',
    subtitle: 'Pull mail & attachments',
    icon: 'bot',
  },
  {
    id: 'archiver-agent',
    layer: 'agents',
    title: 'Document archiver',
    subtitle: 'Places PDFs in the right folder',
    icon: 'bot',
  },
  {
    id: 'extractor-agent',
    layer: 'agents',
    title: 'Extractor & matcher',
    subtitle: 'Structure & line-level match',
    icon: 'bot',
  },
  {
    id: 'validator-agent',
    layer: 'agents',
    title: 'PO validator',
    subtitle: 'Does this order exist in SAP?',
    icon: 'bot',
  },
  {
    id: 'writer-agent',
    layer: 'agents',
    title: 'Ledger writer',
    subtitle: 'Post to SAP & Excel',
    icon: 'bot',
  },
  {
    id: 'notifier-agent',
    layer: 'agents',
    title: 'Outbound mailer',
    subtitle: 'Send to AP / supplier',
    icon: 'bot',
  },
  {
    id: 'orchestrator',
    layer: 'agents',
    title: 'Orchestrator',
    subtitle: 'Route steps & fallbacks',
    icon: 'bot',
  },

  {
    id: 'dash-processing',
    layer: 'dashboard',
    title: 'Processing',
    subtitle: 'Live extraction view',
    icon: 'user',
  },
  {
    id: 'dash-review',
    layer: 'dashboard',
    title: 'Review queue',
    subtitle: 'Low-confidence exceptions',
    icon: 'user',
  },
  {
    id: 'dash-orders',
    layer: 'dashboard',
    title: 'Order overview',
    subtitle: 'PO → confirmed → invoiced',
    icon: 'user',
  },
  {
    id: 'dash-documents',
    layer: 'dashboard',
    title: 'Documents',
    subtitle: 'Structured row store',
    icon: 'user',
  },
  {
    id: 'dash-ask',
    layer: 'dashboard',
    title: 'Ask data',
    subtitle: 'Spend, fill rate, backorders',
    icon: 'user',
  },
  {
    id: 'dash-alerts',
    layer: 'dashboard',
    title: 'SAP posting alerts',
    subtitle: 'MISSING: Not built',
    icon: 'user',
    gap: true,
  },
]

export const ARCHITECTURE_EDGES: ArchitectureEdge[] = [
  e('vendor-db', 'outlook'),
  e('peppol', 'extract-etl'),
  e('outlook', 'graph-mail'),
  e('graph-mail', 'inbox-agent'),
  e('inbox-agent', 'extractor-agent'),
  e('extractor-agent', 'validator-agent'),
  e('extractor-agent', 'dash-processing'),

  e('validator-agent', 'archiver-agent'),
  e('archiver-agent', 'graph-onedrive'),
  e('graph-onedrive', 'onedrive'),
  e('archiver-agent', 'dash-documents'),

  e('validator-agent', 'sap-adapter'),
  e('sap-adapter', 'sap-ecc'),
  e('sap-adapter', 'sap-s4'),
  e('validator-agent', 'dash-review'),

  e('extractor-agent', 'writer-agent'),
  e('validator-agent', 'writer-agent'),
  e('dash-review', 'writer-agent'),
  e('writer-agent', 'sap-adapter'),
  e('writer-agent', 'extract-etl'),
  e('extract-etl', 'excel-shadow'),
  e('extract-etl', 'excel-pricing'),
  e('writer-agent', 'structured-store'),
  e('writer-agent', 'vector-store'),
  e('writer-agent', 'match-store'),
  e('writer-agent', 'dash-orders'),

  e('dash-review', 'notifier-agent'),
  e('notifier-agent', 'graph-mail'),
  e('graph-mail', 'outlook'),
]

export const LAYER_META: { id: ArchitectureLayer; label: string }[] = [
  { id: 'sources', label: 'External & internal systems' },
  { id: 'middleware', label: 'Integration & middleware' },
  { id: 'platform', label: 'Data platform (unified stores)' },
  { id: 'agents', label: 'Agent processing layer' },
  { id: 'dashboard', label: 'Dashboard & presentation' },
]

export const SOURCE_GROUPS: { id: SourceGroup; label: string }[] = [
  { id: 'external', label: 'External data sources' },
  { id: 'internal', label: 'Internal systems (fragmented)' },
]

const ingestNodes = [
  'vendor-db',
  'peppol',
  'outlook',
  'graph-mail',
  'inbox-agent',
  'extractor-agent',
  'validator-agent',
  'dash-processing',
]

const ingestEdges = [
  'vendor-db__outlook',
  'peppol__extract-etl',
  'outlook__graph-mail',
  'graph-mail__inbox-agent',
  'inbox-agent__extractor-agent',
  'extractor-agent__validator-agent',
  'extractor-agent__dash-processing',
]

const archiveNodes = [
  'validator-agent',
  'archiver-agent',
  'graph-onedrive',
  'onedrive',
  'dash-documents',
]

const archiveEdges = [
  'validator-agent__archiver-agent',
  'archiver-agent__graph-onedrive',
  'graph-onedrive__onedrive',
  'archiver-agent__dash-documents',
]

const verifyNodes = [
  'sap-ecc',
  'sap-s4',
  'validator-agent',
  'sap-adapter',
  'dash-review',
]

const verifyEdges = [
  'validator-agent__sap-adapter',
  'sap-adapter__sap-ecc',
  'sap-adapter__sap-s4',
  'validator-agent__dash-review',
]

const writeNodes = [
  'sap-ecc',
  'sap-s4',
  'excel-pricing',
  'excel-shadow',
  'structured-store',
  'vector-store',
  'match-store',
  'extractor-agent',
  'validator-agent',
  'writer-agent',
  'sap-adapter',
  'extract-etl',
  'dash-orders',
  'dash-review',
]

const writeEdges = [
  'extractor-agent__writer-agent',
  'validator-agent__writer-agent',
  'dash-review__writer-agent',
  'writer-agent__sap-adapter',
  'sap-adapter__sap-s4',
  'sap-adapter__sap-ecc',
  'writer-agent__extract-etl',
  'extract-etl__excel-shadow',
  'extract-etl__excel-pricing',
  'writer-agent__structured-store',
  'writer-agent__vector-store',
  'writer-agent__match-store',
  'writer-agent__dash-orders',
]

const emailOutNodes = [
  'outlook',
  'graph-mail',
  'notifier-agent',
  'dash-review',
]

const emailOutEdges = [
  'dash-review__notifier-agent',
  'notifier-agent__graph-mail',
  'graph-mail__outlook',
]

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'overview',
    label: 'Overview',
    caption:
      'Vendors email into Outlook; Peppol invoices arrive already structured. Agents reach OneDrive and other stores through internal systems (Outlook, SAP, Excel), then write back. Click a step to follow one path.',
    nodeIds: [],
    edgeIds: [],
    triggerNodeIds: [],
  },
  {
    id: 'ingest',
    label: '1. Ingest email',
    caption:
      'Starts when a PO hits the shared inbox, or a Peppol invoice arrives already structured. Inbox ingest hands PDFs to the extractor and matcher; Peppol rows pass through to the extracted store.',
    nodeIds: ingestNodes,
    edgeIds: ingestEdges,
    triggerNodeIds: ['outlook'],
  },
  {
    id: 'archive',
    label: '2. Archive to OneDrive',
    caption:
      'Starts when the PO validator calls the document archiver. The archiver files the PDF through Graph OneDrive; Documents is the dashboard output.',
    nodeIds: archiveNodes,
    edgeIds: archiveEdges,
    triggerNodeIds: ['validator-agent'],
  },
  {
    id: 'verify',
    label: '3. Verify PO in SAP',
    caption:
      'Starts when the PO validator checks that the extracted order exists in SAP ECC and S/4HANA. Review is where exceptions land — an output, not the trigger.',
    nodeIds: verifyNodes,
    edgeIds: verifyEdges,
    triggerNodeIds: ['validator-agent'],
  },
  {
    id: 'write',
    label: '4. Write SAP & Excel',
    caption:
      'Starts from the extractor & matcher, the PO validator, or an approval in Review. The ledger writer posts to Excel and SAP, and writes the extracted, RAG, and match stores.',
    nodeIds: writeNodes,
    edgeIds: writeEdges,
    triggerNodeIds: ['extractor-agent', 'validator-agent', 'dash-review'],
  },
  {
    id: 'email-out',
    label: '5. Email outbound',
    caption:
      'Starts from Review: a clerk sends the pack back through Outlook to AP or the vendor. Outlook is the channel out, not the trigger.',
    nodeIds: emailOutNodes,
    edgeIds: emailOutEdges,
    triggerNodeIds: ['dash-review'],
  },
]

export function nodesForLayer(layer: ArchitectureLayer) {
  return ARCHITECTURE_NODES.filter((node) => node.layer === layer)
}

export function nodesForSourceGroup(group: SourceGroup) {
  return ARCHITECTURE_NODES.filter((node) => node.group === group)
}
