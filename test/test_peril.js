// test_peril.js
//
// This script tests peril's the JavaScript API. The test_peril.sh performs similar tests
// on the command line tool using bash.

// First, let's import the peril module & create an instance:

var assert   = require( 'assert' );
var fs       = require( 'fs' );
               require( 'sn-core' );
var peril    = require( '../peril' );
var spawn    = require( 'child_process' ).spawn;

var root     = [ __dirname, 'root' ].join( '/' );
var instance = new peril( { root: root } );

// Test to see that root was initialized correctly
assert.equal( root, instance.root, 'problem constructing root directory' );

// Create two profiles:
var profile_names = Array(2)._$each( function( e, i ) {
  this[ i ] = [ 'profile', Date.now(), i ].join( '_' );
} );

__create_profiles( null, __test_profiles );

function __create_profiles( list, callback ) {
  if( ! list ) {
    return __create_profiles( profile_names.slice(), callback );
  }

  if( 0 == list.length ) {
    return callback._$nextTick();
  }
  var current = list.shift();

  console.log( "creating profile: " + current );

  instance.profile_create( current, function( err ) {
    assert.equal( err, null, 'error creating profile ' + current );
    return __create_profiles._$nextTick( list, callback );
  } );
}

function __test_profiles( list ) {
  if( ! list ) {
    return __test_profiles( profile_names.slice() );
  }

  if( 0 == list.length ) {
    return __test_list_profiles._$nextTick();
  }

  var current = list.shift();

  console.log( "checking profile was created: " + current );

  fs.lstat( [ root, 'etc/peril', current ].join('/'), function( err, stats ) {
    assert.equal( err, null, 'profile not present ' + current );
    return __test_profiles._$nextTick( list );
  } );
}

function __test_list_profiles( list ) {
  if( ! list ) {
    return __test_list_profiles( profile_names.slice() );
  }

  console.log( "checking profiles are listed properly" );

  instance.profile_list( function( err, profiles ) {
    assert.equal( err, null, 'error listing profiles' );
    assert.equal( 'object', typeof profiles );
    assert.equal( 2, profiles.length );
    assert.equal( true, profiles._$any( function( e ) { return e === list[0]; } ) );
    assert.equal( true, profiles._$any( function( e ) { return e === list[1]; } ) );
    return __test_destroy_profiles._$nextTick();
  } );
  
}

function __test_destroy_profiles( list ) {
  if( ! list ) {
    return __test_destroy_profiles( profile_names.slice() );
  }

  if( 0 == list.length ) {
    // Create the profiles again so we can use them with further tests.
    return __create_profiles._$nextTick( null, __test_ref_profiles );
  }

  var current = list.shift();

  console.log( "destroying profile: " + current );

  instance.profile_destroy( current, function( err ) {
    assert.equal( err, null, 'error destroying profile ' + current );
    return __test_destroy_profiles._$nextTick( list );
  } );
}

function __test_ref_profiles( list ) {
  if( ! list ) {
    return __test_ref_profiles( profile_names.slice() );
  }

  if( 0 == list.length ) {
    return __clean._$nextTick();
  }

  var current = list.shift();

  console.log( "getting reference for: " + current );

  instance.profile_ref( current, function( err, reference ) {
    assert.equal( err, null, 'error referencing profile ' + reference );
    assert.equal( reference, [ root, 'etc/peril', current ].join( '/' ) );
    return __test_ref_profiles._$nextTick( list );
  } );
}

function __clean () {
  var dirname = __dirname + '/root/etc/peril';
  var rmrf = spawn( 'rm', [ '-rf' ].concat( profile_names ), {cwd: dirname } );
  rmrf.on( 'close', function( code ) {
    var err;
    if( 0 !== code ) {
      err = new Error( 'rm command returned with non-zero return code: ' + code );
      console.log( err.toString() );
    }
  } );
}