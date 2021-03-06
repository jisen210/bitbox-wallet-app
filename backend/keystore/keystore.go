// Copyright 2018 Shift Devices AG
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package keystore

import (
	"github.com/btcsuite/btcutil/hdkeychain"
	"github.com/digitalbitbox/bitbox-wallet-app/backend/coins/coin"
	"github.com/digitalbitbox/bitbox-wallet-app/backend/signing"
)

// Keystore supports hardened key derivation according to BIP32 and signing of transactions.
//go:generate mockery -name Keystore
type Keystore interface {
	// // Configuration returns the configuration of the keystore.
	// // The keypath is m/44' for singlesig and m/46' for multisig.
	// Configuration() *signing.Configuration

	// CosignerIndex returns the index at which the keystore signs in a multisig configuration.
	// The returned value is always zero for a singlesig configuration.
	CosignerIndex() int

	// Identifier returns the SHA256 hash of the master extended public key.
	Identifier() (string, error)

	// HasSecureOutput returns whether the keystore supports to output an address securely.
	// This is typically done through a screen on the device or through a paired mobile phone.
	HasSecureOutput() bool

	// OutputAddress outputs the public key at the given absolute keypath for the given coin.
	// Please note that this is only supported if the keystore has a secure output channel.
	OutputAddress(signing.AbsoluteKeypath, signing.ScriptType, coin.Coin) error

	// ExtendedPublicKey returns the extended public key at the given absolute keypath.
	ExtendedPublicKey(signing.AbsoluteKeypath) (*hdkeychain.ExtendedKey, error)

	// SignMessage(string, *signing.AbsoluteKeypath, coin.Coin) (*big.Int, error)

	// SignTransaction signs the given transaction proposal.
	SignTransaction(coin.ProposedTransaction) error
}
