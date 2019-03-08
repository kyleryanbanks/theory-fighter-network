module.exports = {
  name: 'game-engine',
  preset: '../../jest.config.js',
  coverageDirectory: '../../coverage/libs/game-engine',
  snapshotSerializers: [
    'jest-preset-angular/AngularSnapshotSerializer.js',
    'jest-preset-angular/HTMLCommentSerializer.js'
  ]
};
