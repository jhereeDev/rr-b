class Options {
  constructor(filter, scope, attributes, paged, sizeLimit) {
    this.filter = filter || '';
    this.scope = scope || 'sub';
    this.attributes = attributes || [];
    this.paged = paged || true;
    this.sizeLimit = sizeLimit || 50;
  }
}

module.exports = { Options };
