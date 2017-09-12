
var gitParams = process.env.GIT_PARAMS;
var parts = gitParams.split(' ');

var originName = parts[0];
if (originName === 'inceptum-etl') {
  console.log('Pushing to inceptum-etl origin is disabled');
  process.exit(1);
}