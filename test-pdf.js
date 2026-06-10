const React = require('react');
const { renderToStream, Document, Page, Text } = require('@react-pdf/renderer');
renderToStream(
  React.createElement(Document, null, 
    React.createElement(Page, null, 
      React.createElement(Text, null, 
        'Test ', 
        React.createElement(Text, {style: {backgroundColor: 'yellow'}}, 'highlight')
      )
    )
  )
).then(s => {
  let res = '';
  s.on('data', c => res += c);
  s.on('end', () => console.log('success'));
}).catch(e => console.error(e));
