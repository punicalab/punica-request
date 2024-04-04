interface IPatch {
  op: 'test' | 'remove' | 'add' | 'replace' | 'move' | 'copy';
  path: string;
  value: any;
  from?: string;
}

export default IPatch;
