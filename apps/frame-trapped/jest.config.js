module.exports = {
  name: 'frame-trapped',
  preset: '../../jest.config.js',
  coverageDirectory: '../../coverage/apps/frame-trapped/',
  snapshotSerializers: [
    'jest-preset-angular/AngularSnapshotSerializer.js',
    'jest-preset-angular/HTMLCommentSerializer.js'
  ]
};
