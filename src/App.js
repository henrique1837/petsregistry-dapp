import React, { Component } from 'react';
import Web3 from "web3";
import './App.css';
import * as TokenArtifact from './contracts/ItemsERC721.json';

import {
  Button,
  Nav,
  NavLink,
  NavItem,
  Row,
  Col,
  Spinner,
  Container,
} from 'reactstrap';


import {
  HashRouter as Router,
  Route,
  Switch,
  Redirect
} from 'react-router-dom';

import MintToken from './components/MintToken.js';
import EditToken from './components/EditToken.js';
import TokenAttrs from './components/TokenAttrs.js';
import Token from './components/Token.js';
import Menu from './components/Menu.js';
const Config = require('./config.js');
const admin = Config.admin;
const AppName = Config.AppName;
const Box = require('3box');
const IPFS = require('ipfs-api');
const ipfs = new IPFS({host: "ipfs.infura.io", port: 5001, protocol: "https"});
let socket = process.env.REACT_APP_WEB3SOCKET
class App extends Component {

  state = {
    loading: false
  }

  constructor(props) {
    super(props)
    this.login = this.login.bind(this);
  }

  componentDidMount = async function () {

      let web3 =  new Web3(socket);
      if(window.ethereum){
        web3 = new Web3(window.ethereum);
      }
      let explorer;
      let tokenAddr;
      const netId = await web3.eth.net.getId();
      if(netId != 4){
        alert("Please connect to rinkeby network and reload");
      }
      if(netId == 1){
        explorer = 'https://etherscan.io';
        tokenAddr = Config.tokenAddrMainnet;
      } else if(netId == 3){
        explorer = 'https://ropsten.etherscan.io'
        tokenAddr = Config.tokenAddrRopsten;
      } else if(netId == 4){
        explorer = 'https://rinkeby.etherscan.io'
        tokenAddr = Config.tokenAddrRinkeby;
      } else if(netId == 5){
        explorer = 'https://goerli.etherscan.io'
        tokenAddr = Config.tokenAddrGoerli;
      } else {
        explorer = 'https://etherscan.io'
        tokenAddr = Config.tokenAddrGanache;
      }
      const token = new web3.eth.Contract(TokenArtifact.abi, tokenAddr);
      const events = await token.getPastEvents("Minted",{
          filter: {},
          fromBlock: 0
      });
      const that = this;
      token.events.Minted({
        filter: {},
        fromBlock: 'latest'
      },async (err,res) => {
        that.state.events.push(res);
        await that.forceUpdate();
      });
      await this.setState({
        token: token,
        events: events,
        web3: web3,
        explorer: explorer,
        ipfs:ipfs,
        tokenAddr: tokenAddr,
      })
    if(!window.ethereum){
      this.setState({
        hasWeb3: false
      });
      return;
    }
    await this.setState({
      hasWeb3: true
    });

  }

  login = async function () {
    await this.setState({
      loading: true
    });
    try {
      await window.ethereum.enable();
      const web3 = new Web3(window.ethereum);
      const tokenAddr = this.state.tokenAddr;
      const coinbase = await web3.eth.getCoinbase();
      const token = new web3.eth.Contract(TokenArtifact.abi, tokenAddr);
      console.log(token);
      await this.setState({
        waitingMessage:
          <>
            <Spinner color="primary" />
            <p>Loading ...</p>
            <p>Accessing your 3box account</p>
          </>
      });
      const box = await Box.openBox(coinbase, window.ethereum);
      await this.setState({
        waitingMessage:
          <>
            <Spinner color="primary" />
            <p>Loading ...</p>
            <p>Opening pets-registry-test space</p>
          </>
      });
      console.log(AppName)
      const spaces = [AppName];
      console.log("Auth")
      await box.auth(spaces, { address: coinbase, provider: window.ethereum });
      console.log("Sync box")
      await box.syncDone;
      console.log("Open space")
      const space = await box.openSpace(AppName);
      const did = box.DID;
      console.log(did);
      const DEFAULT_ADMIN_ROLE = await token.methods.DEFAULT_ADMIN_ROLE().call();
      const MINTER_ROLE = await token.methods.MINTER_ROLE().call();
      const isAdmin = await token.methods.hasRole(DEFAULT_ADMIN_ROLE,coinbase);
      if (!isAdmin) {
        await this.setState({
          waitingMessage: <p>You are not admin of this Dapp.</p>,
          isAdmin: false
        });
        //return;
      } else {
        await this.setState({
          waitingMessage: <p>You are admin of this Dapp. Checking past events ...</p>,
          isAdmin: true
        });
      }

      await this.setState({
        web3: web3,
        space: space,
        coinbase: coinbase,
        token: token,
        box: box
      });
      console.log(box)
      await this.setState({
        loading: false
      });
      return(
        <Redirect to={'/mintTokens'} />
      )
    } catch (err) {
      await this.setState({
        err: <p>{err.message}</p>,
        loading: false
      });
      console.log(err);
    }
  }


  render() {
    return (
      <div className="App">
        <Router>
          {
            (
              this.state.box &&
              (
                <Menu box={this.state.box} isAdmin={this.state.isAdmin} />
              )
            )
          }
          {
            (
              !this.state.box &&
              (
                <Menu box={this.state.box} isAdmin={this.state.isAdmin} />
              )
            )
          }
          <Container>
            <Row>
              <Col lg={12}>
                <header>
                  {
                    (
                      this.state.loading &&
                      (
                        <>
                          <center style={{ paddingTop: '40px' }}>
                            {this.state.waitingMessage}
                          </center>
                        </>
                      )
                    )
                  }
                  {
                    (
                      this.state.err &&
                      (
                        <>
                          <center style={{ paddingTop: '40px' }}>
                            {this.state.err}
                          </center>
                        </>
                      )
                    )
                  }
                </header>
                {
                  (

                    this.state.token &&
                    (
                      <>

                        <Switch>
                          <Route path={"/home"} render={() => {
                            return (
                              <Container fluid={false} style={{ paddingTop: '50px' }}>
                                <center>
                                  <h2>Pets Registry dapp</h2>
                                </center>
                                <Row style={{paddingTop:'50px',paddingBottom:'150px',textAlign:'center'}}>
                                  <Col lg={6}>
                                    <p>Register your pet as a non fungible ERC721 token</p>
                                  </Col>
                                  <Col lg={6}>
                                    <p>Store images records and more</p>
                                  </Col>
                                </Row>
                                <div>
                                  <p>PetsRegistry is based on <a href='https://docs.unstoppabledomains.com/domain-registry-essentials/architecture-overview' target='_blank' rel="noreferrer">Unstoppable Domains</a> and <a href="https://ens.domains/" targe="_blank" rel="noreferrer">ENS</a> smarts contracts architeture. The ERC721 token is vinculated to a Resolver smart contract which has the function to allow owner of the token to set values for certain keys (in this case, 'vacines' and 'images' keys)</p>
                                </div>
                              </Container>
                            );

                          }

                          } />

                          <Route path={"/mintTokens"} render={() => {
                            if (!this.state.box ||
                                !this.state.token ||
                                !this.state.web3) {
                              return (
                                <p>Do not have access</p>
                              )
                            }
                            return (
                              <Container fluid={false} style={{ paddingTop: '50px' }}>
                                <MintToken
                                  web3={this.state.web3}
                                  box={this.state.box}
                                  token={this.state.token}
                                  coinbase={this.state.coinbase}
                                  ipfs={this.state.ipfs}
                                  explorer={this.state.explorer}
                                  events={this.state.events}
                                />
                              </Container>
                            );

                          }

                          } />

                          <Route path={"/editToken"} render={() => {
                            if (!this.state.box ||
                                !this.state.token ||
                                !this.state.web3) {
                              return (
                                <p>Do not have access</p>
                              )
                            }
                            return (
                              <Container fluid={false} style={{ paddingTop: '50px' }}>
                                <EditToken
                                  web3={this.state.web3}
                                  box={this.state.box}
                                  space={this.state.space}
                                  token={this.state.token}
                                  coinbase={this.state.coinbase}
                                  ipfs={this.state.ipfs}
                                  explorer={this.state.explorer}
                                  events={this.state.events}
                                />
                              </Container>
                            );

                          }

                          } />

                          <Route path={"/token/:id"} render={(props) => {

                              return(
                                <Container fluid={false}>
                                  <Token
                                    web3={this.state.web3}
                                    box={this.state.box}
                                    token={this.state.token}
                                    coinbase={this.state.coinbase}
                                    explorer={this.state.explorer}
                                    resolver={this.state.resolver}
                                    ipfs={this.state.ipfs}
                                    events={this.state.events}
                                    {...props} />
                                </Container>
                              )
                          }} />
                          <Route path={"/tokens"} render={() => {
                            return (
                              <Container fluid={false} style={{ paddingTop: '50px' }}>
                                <TokenAttrs
                                  web3={this.state.web3}
                                  box={this.state.box}
                                  token={this.state.token}
                                  coinbase={this.state.coinbase}
                                  explorer={this.state.explorer}
                                  resolver={this.state.resolver}
                                  ipfs={this.state.ipfs}
                                  events={this.state.events}
                                />
                              </Container>
                            );

                          }

                          } />

                          <Route path="/login" render={ () => {
                            let page =
                            <center style={{ paddingTop: '100px' }}>
                              <h2>Enable your 3box pets-registry-test space</h2>
                              <Button onClick={this.login}>Enable</Button>
                            </center>

                            if(!this.state.space && !this.state.hasWeb3){
                              page =
                              <center style={{ paddingTop: '100px' }}>
                                <h2>Need browser with web3</h2>
                                <p>Install <a href='https://brave.com/?ref=hen956' target='_blank'>Brave browser</a> or <a href='https://metamask.io/' target='_blank'>Metamask</a></p>
                              </center>
                            }
                            if(this.state.space && this.state.hasWeb3){
                              page =
                              <center style={{ paddingTop: '100px' }}>
                                <h2>You are logged in</h2>
                              </center>
                            }
                            return(page);

                          }} />
                          <Route path="/login" render={ () => {
                            let page =
                            <center style={{ paddingTop: '100px' }}>
                              <h2>Enable your 3box pets-registry-test space</h2>
                              <Button onClick={this.login}>Enable</Button>
                            </center>

                            if(!this.state.space && !this.state.hasWeb3){
                              page =
                              <center style={{ paddingTop: '100px' }}>
                                <h2>Need browser with web3</h2>
                                <p>Install <a href='https://brave.com/?ref=hen956' target='_blank'>Brave browser</a> or <a href='https://metamask.io/' target='_blank'>Metamask</a></p>
                              </center>
                            }
                            if(this.state.space && this.state.hasWeb3){
                              page =
                              <center style={{ paddingTop: '100px' }}>
                                <h2>You are logged in</h2>
                              </center>
                            }
                            return(page);

                          }} />

                          <Route render={() => {
                            return(
                              <Redirect to={"/home"} />
                            );
                          }} />

                        </Switch>




                      </>
                    )
                  )
                }

              </Col>
            </Row>
          </Container>
        </Router>
        <footer className="footer" style={{paddingTop: '150px'}}>
          <Row className="align-items-center justify-content-xl-between">
            <Col xl="6">
              <div className="copyright text-center text-xl-left text-muted">
                © 2020{"PetsRegistry"}
              </div>
            </Col>

            <Col xl="6">
              <Nav className="nav-footer justify-content-center justify-content-xl-end">

                <NavItem>
                  <NavLink
                    href="https://brave.com/?ref=hen956" target='_blank' title='Brave Browser'
                  >
                    Use it with Brave browser
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    href="https://github.com/henrique1837/petsregistry-dapp" target='_blank' title='Github repository'
                  >
                    Github
                  </NavLink>
                </NavItem>

              </Nav>
            </Col>
          </Row>
        </footer>
      </div>
    );
  }
}

export default App;
