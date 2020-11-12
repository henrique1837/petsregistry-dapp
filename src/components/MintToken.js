import React, { Component } from 'react';
import {
  Row,
  Col,
  Button,
  Alert,
  Spinner,
  FormGroup,
  Label,
  Input,
  InputGroup,
  Table,
} from 'reactstrap';

import * as MinterArtifact from '../contracts/Minter.json';
const MINTER_ADDRESS = '0x6ac41083E6728689479c46bAd567C6C4A8996e03';
class MintToken extends Component {
  state = {
    box: null,
    web3: null,
    ipfs: null,
    events: [],
    transaction: null,
    domainsUsed: [],
    objsMint: [],
    contentIPFS: [],
    url: '',
    receiver: '',
    isAdmin: false,
  }
  constructor(props) {
    super(props);
    this.addIPFS = this.addIPFS.bind(this);
    this.addIPFSPromise = this.addIPFSPromise.bind(this);
    this.mintTokens = this.mintTokens.bind(this);
    this.eventsEmited = this.eventsEmited.bind(this);
    this.fileUpload = this.fileUpload.bind(this);
    this.setBreed = this.setBreed.bind(this);
    this.setName = this.setName.bind(this);
    this.setBirthday = this.setBirthday.bind(this);

  }
  componentDidMount = async function () {
    await this.setState({
      box: this.props.box,
      web3: this.props.web3,
      coinbase: this.props.coinbase,
      ipfs: this.props.ipfs,
      token: this.props.token,
      resolver: this.props.resolver,
      explorer: this.props.explorer
    });
    const DEFAULT_ADMIN_ROLE = await this.props.token.methods.DEFAULT_ADMIN_ROLE().call();
    const MINTER_ROLE = await this.props.token.methods.MINTER_ROLE().call();
    const minterContract = new this.props.web3.eth.Contract(MinterArtifact.abi,MINTER_ADDRESS);
    const isSU = await this.props.token.methods.hasRole(DEFAULT_ADMIN_ROLE,this.props.coinbase).call();
    const isMinter = await this.props.token.methods.hasRole(MINTER_ROLE,this.props.coinbase).call();
    if(isMinter || isSU){
      this.setState({
        isAdmin: true
      })
    }
    this.setState({
      minterContract: minterContract
    })
    const events = this.props.events;
    for(const res of events){
      this.eventsEmited(null,res);
    }
    this.props.token.events.allEvents({
      filter: {},
      fromBlock: 'latest'
    },this.eventsEmited);
  }

  eventsEmited =  async function (err, res) {
    if(res){
      const ipfs = this.props.ipfs;
      console.log(res)
      if (res.event = "Minted" ) {
        try {

            const uri = (await this.props.token.methods.tokenURI(res.returnValues.tokenId).call()).replace("ipfs://ipfs/","");
            console.log(uri);
            const attributes = JSON.parse(await ipfs.files.cat(uri));
            console.log(attributes)
            const image = attributes.image;
            const breed = attributes.attributes[1].value;
            const birthday = attributes.attributes[2].value;
            const name = attributes.name;
            const obj = {
              uri: uri,
              returnValues: res.returnValues,
              ipfs: {
                name: name,
                image: image,
                breed: breed,
                birthday: birthday
              }
            }
            if(!this.state.events.includes(JSON.stringify(obj))){
              this.state.events.push(JSON.stringify(obj));
              await this.forceUpdate();
            }

        } catch (err) {
          console.log(err);
        }
      }
    }
  }

  mintTokens = async () => {
    const objsMint = this.state.objsMint;
    const domain = objsMint.map(obj => {
      return(obj.domain);
    })
    //const external_url = 'https://blockchainsdomain.com';
    const to = objsMint.map(obj => {
      return(obj.receiver);
    })
    const that = this;
    const coinbase = this.state.coinbase;
    const uri = this.state.contentIPFS;
    console.log(uri)
    try {
      let method = this.state.token.methods.mintMany(to,uri);
      let price = 0;
      console.log(this.state.minterContract)
      if(!this.state.isAdmin){
        price = (await this.state.minterContract.methods.price().call())*to.length;
        method = this.state.minterContract.methods.doMintMany(to,uri);
      }
      await method.estimateGas({from: coinbase,value: price});

      method.send({ from: coinbase,value: price })
        .once('transactionHash', async function (hash) {
          const objs = objsMint.map(obj => {
            return(
              that.addIPFSPromise(obj,false)
            )
          });
          await that.setState({
            txHash: {
              confirmed: false,
              hash: hash
            },
            objsMint:[],
            contentIPFS: []
          });
          await Promise.all(objs);
        })
        .once('confirmation', async function (confirmationNumber, receipt) {
          await that.setState({
            txHash: {
              confirmed: true,
              hash: receipt.transactionHash
            }
          });
        })
        .once('error', function (err) {
          const domainsUsed = that.state.domainsUsed.filter(dom => {
            if(!domain.includes(dom)){
              return(dom);
            }
          })
          that.setState({
            txHash: {
              confirmed: false,
              hash: null,
              err: err.message
            },
            objsMint:[],
            contentIPFS: [],
            domainsUsed: domainsUsed
          });
        });

    } catch (err) {
        console.log(err);
        const domainsUsed = this.state.domainsUsed.filter(dom => {
          if(!domain.includes(dom)){
            return(dom);
          }
        })
        that.setState({
          txHash: {
            confirmed: false,
            hash: null,
            err: err.message
          },
          objsMint:[],
          contentIPFS: [],
          domainsUsed: domainsUsed
        });
      }
  };
  addIPFSPromise = (obj,onlyHash) => {
    return new Promise(async (resolve,reject) => {
      try {
        const ipfs = this.state.ipfs
        const name = obj.name;
        const breed = obj.breed;
        const image = obj.image;
        const birthday = obj.birthday;
        const type = obj.type;
        if (!name || !breed || !image) {
          throw new Error("No extension or domain defined");
        }
        //const imageIPFS = await ipfs.add(ipfs.Buffer.from(photo),{onlyHash:onlyHash});
        //const image = `https://ipfs.io/ipfs/${imageIPFS[0].hash}`;
        //const image = `https://ipfs.io/ipfs/${imageIPFS[0].hash}`;
        console.log(this.state.events)
        let newItemId = Math.max.apply(null,this.state.events.map(obj => {
          const item = JSON.parse(obj);
          return(item.returnValues.tokenId);
        }))
        if(newItemId=="-Infinity"){
          newItemId = 1;
        } else {
          newItemId = newItemId + 1;
        }
        const external_url = `${window.location.href.split('/mintTokens')[0]}/token/${newItemId}`;
        console.log(external_url)
        const content = {
          name: name,
          image: image,
          external_url: external_url,
          description: "Proof of Concept pet registry.",
          attributes: [
            {
              trait_type: "Name",
              value: name
            },
            {
              trait_type: "Breed",
              value: breed
            },
            {
              trait_type: "Birthday",
              value: birthday
            },
            {
              trait_type: "Type",
              value: type
            }
          ]
        };
        const res = await ipfs.add(ipfs.Buffer.from(JSON.stringify(content)),{onlyHash: onlyHash});
        //const uri = res[0].hash;
        const uri = res[0].hash;
        resolve(uri);
      } catch(err){
        reject(err);
      }
    });
  }
  addIPFS = async function () {
    try {
      this.setState({
        contentIPFS: [],
        loadingIPFS: true
      });
      const objsMint = this.state.objsMint;
      console.log(objsMint);
      let urisPromise = [];
      for(const obj of objsMint){
        console.log(obj)
        urisPromise.push(this.addIPFSPromise(obj,false));
      }
      const contentIPFS = await Promise.all(urisPromise);
      this.setState({
        contentIPFS: contentIPFS,
        loadingIPFS: false
      });
    } catch (err) {
      console.log(err)
    }
  }

  addObjToMint = async () => {
    this.setState({
      txHash: null
    });
    const name = this.state.name;
    const breed = this.state.breed;
    const birthday = this.state.birthday;
    const type = this.state.type;
    const photo = this.state.photo;
    const res = await this.state.ipfs.add(this.state.ipfs.Buffer.from(photo), { onlyHash: false });
    //const uri = res[0].hash;
    const uri = res[0].hash;
    const image = `https://ipfs.io/ipfs/${uri}`;
    const to = this.state.receiver;
    if(to == '' || !to){
      this.setState({
        warning: "No wallet set to send token to"
      });
      return;
    }
    this.state.objsMint.push({
      name: name,
      breed: breed,
      birthday: birthday,
      type: type,
      image: image,
      receiver: to
    });
    await this.forceUpdate();
    console.log(this.state.objsMint)
  };
  fileUpload = async function(e){
    try{
      const file = e.target.files[0];
      const type = file.type;
      const reader  = new FileReader();
      const that = this;
      reader.onload = function(c){
        const base64 = btoa(
          new Uint8Array(c.target.result)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const content = "data:"+type+";base64,"+base64
        that.setState({
          photo: c.target.result,
          imagePreview: <img src={content} style={{width: '50%'}}/>
        })
      }

      reader.readAsArrayBuffer(file);

    } catch(err){
      console.log(err)
    }
  }

  setReceiver = (e) => {
    e.preventDefault();
    this.setState({
      receiver: e.target.value,
      warning: null
    });
  };
  setName = (e) => {
    e.preventDefault();
    this.setState({
      name: e.target.value
    });
  };
  setBreed = (e) => {
    e.preventDefault();
    this.setState({
      breed: e.target.value
    });
  };
  setBirthday = (e) => {
    e.preventDefault();
    this.setState({
      birthday: e.target.value
    });
  };
  setAnimal = (e) => {
    e.preventDefault();
    this.setState({
      type: e.target.value
    });
  };
  removeDomain = async (domain) => {
    const objsMint = this.state.objsMint.filter(obj => {

        if(obj.domain != domain){
          return(obj)
        }

    });
    const domainsUsed = this.state.domainsUsed.filter(dom => {
      if(dom != domain){
        return(dom)
      }
    });
    this.setState({
      objsMint: objsMint,
      domainsUsed: domainsUsed
    });
    return;
  };


  render() {
    const that = this;
    return (
      <>
        {
          (
            this.state.token &&
            (
              <>
                <div>
                  <h4>Mint Tokens</h4>
                  <p>Token Contract Address: <a className='address' href={`${this.state.explorer}/token/${this.state.token.options.address}`} target='_blank'>{this.state.token.options.address}</a></p>
                </div>
                <div>
                  <FormGroup>
                    {
                      (
                        this.state.warning &&
                        (
                          <Alert color="danger">
                            <center>
                              <p><b>{this.state.warning}</b></p>
                            </center>
                          </Alert>
                        )
                      )
                    }
                    <Row>
                      <Col lg={2}>
                        <Label>Name *</Label>
                      </Col>
                      <Col lg={10}>
                        <InputGroup className="input-group-alternative mb-4">
                          <Input
                            className="form-control-alternative"
                            placeholder="Enter Pet's Name"
                            type="text"
                            //style={{textTransform: 'lowercase'}}
                            onChange={this.setName}
                          />
                        </InputGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col lg={2}>
                        <Label>Animal *</Label>
                      </Col>
                      <Col lg={10}>
                        <InputGroup className="input-group-alternative mb-4">
                          <Input
                            className="form-control-alternative"
                            placeholder="Enter Pet's Type"
                            type="text"
                            style={{textTransform: 'lowercase'}}
                            onChange={this.setAnimal}
                          />
                        </InputGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col lg={2}>
                        <Label>Breed *</Label>
                      </Col>
                      <Col lg={10}>
                        <InputGroup className="input-group-alternative mb-4">
                          <Input
                            className="form-control-alternative"
                            placeholder="Enter Pet's Breed"
                            type="text"
                            //style={{textTransform: 'lowercase'}}
                            onChange={this.setBreed}
                          />
                        </InputGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col lg={2}>
                        <Label>Birthday *</Label>
                      </Col>
                      <Col lg={10}>
                        <InputGroup className="input-group-alternative mb-4">
                          <input type="date" onChange={this.setBirthday}/>
                        </InputGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col lg={2}>
                        <Label>Image *</Label>
                      </Col>
                      <Col lg={10}>
                        <InputGroup className="input-group-alternative mb-4">
                          <input type="file" onChange={this.fileUpload}/>
                        </InputGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col lg={2}>
                        <Label>Wallet to Send *</Label>
                      </Col>
                      <Col lg={10}>
                        <InputGroup className="input-group-alternative mb-4">
                          <Input
                            className="form-control-alternative"
                            placeholder="Enter Wallet Address To Send"
                            type="text"
                            onChange={this.setReceiver}
                          />
                        </InputGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col lg={12}>
                        <p><small>* compulsory fields</small></p>
                      </Col>
                    </Row>
                    <Row>
                      <Col lg={12}>
                        {
                          (
                            this.state.imagePreview &&
                            !this.state.warning &&
                            (
                              <center>
                                <h5>Image preview</h5>
                                <center>
                                  {this.state.imagePreview}
                                </center>
                              </center>

                            )
                          )
                        }
                      </Col>
                    </Row>

                  </FormGroup>
                  {
                    (
                      !this.state.warning &&
                      (
                        <div style={{paddingBottom: '50px'}}>
                          <Button onClick={this.addObjToMint}>Add to Mint</Button>
                        </div>
                      )
                    )
                  }


                </div>
              </>
            )
          )
        }

        {
          (
            this.state.objsMint.length > 0 &&
            (
              <>
                <h4>Tokens to be Minted</h4>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Breed</th>
                      <th>Birthday</th>
                      <th>Image</th>
                      <th>Animal</th>
                    </tr>
                  </thead>
                  <tbody>
                  {
                    this.state.objsMint.map(obj => {
                      return(
                          <tr>
                            <td>{obj.name}</td>
                            <td>{obj.breed}</td>
                            <td>{obj.birthday}</td>
                            <td><img src={obj.image} style={{width: '30px'}} /></td>
                            <td>{obj.type}</td>
                            <td><Button onClick={() => {this.removeDomain(obj)}} color="danger">x</Button></td>
                          </tr>
                      );
                    })
                  }
                  </tbody>
                  </Table>
                <div style={{paddingBottom: '25px'}}>
                  <Button onClick={this.addIPFS}>Add to IPFS</Button>
                </div>
              </>
            )
          )
        }
        {
          (
            this.state.contentIPFS.length > 0 &&
            !this.state.loadingIPFS &&
            (
              <>
              <Alert color="success">
                {
                  this.state.contentIPFS.map(ipfsHash => {
                    return(
                      <p>IPFS content at <a className='hash' href={`https://ipfs.io/ipfs/${ipfsHash}`} target='_blank'>{ipfsHash}</a></p>
                    );
                  })
                }
                </Alert>
                <div style={{ paddingTop: '50px' }}>
                  <Button onClick={this.mintTokens}>Mint</Button>
                </div>
              </>
            )
          )
        }
        {
          (
            this.state.contentIPFS.length == 0 &&
            this.state.loadingIPFS &&
            (
              <>
                <Alert color="info" style={{textAlign: 'center'}}>
                  <b>Uploading file(s) to IPFS</b>
                  <center style={{ paddingTop: '5px' }}>
                    <Spinner color="primary" />
                  </center>
                </Alert>

              </>
            )
          )
        }
        {
          (
            this.state.txHash &&
            this.state.txHash.hash &&
            !this.state.txHash.confirmed &&
            !this.state.txHash.err &&
            (
              <Alert className='alertTx' color="info">
                Transaction <a className='hashTx' href={`${this.state.explorer}/tx/${this.state.txHash.hash}`} target='_blank'>{this.state.txHash.hash}</a> sent to blockchain
              </Alert>
            )
          )
        }
        {
          (
            this.state.txHash &&
            this.state.txHash.hash &&
            this.state.txHash.confirmed &&
            !this.state.txHash.err &&
            (
              <Alert className='alertTx' color="success">
                Transaction <a className='hashTx' href={`${this.state.explorer}/tx/${this.state.txHash.hash}`} target='_blank'>{this.state.txHash.hash}</a> confirmed
              </Alert>
            )
          )
        }

        {
          (
            this.state.txHash &&
            this.state.txHash.err &&
            (
              <Alert color="danger">
                {this.state.txHash.err}
              </Alert>
            )
          )
        }




        {
          (
            (this.state.events.length > 0) &&
            (
              <div style={{paddingTop:'50px'}}>
                <h4>Tokens Minted</h4>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Breed</th>
                      <th>Birthday</th>
                      <th>Image</th>
                      <th>Uri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      this.state.events.map(res => {
                        const event = JSON.parse(res);
                        const name = event.ipfs.name;
                        const uri = event.uri;
                        const image = event.ipfs.image;
                        const breed = event.ipfs.breed;
                        const birthday = event.ipfs.birthday;
                        const id = event.returnValues.tokenId;
                        return (
                            <tr>
                              <td>{id}</td>
                              <td>{name}</td>
                              <td>{breed}</td>
                              <td>{birthday}</td>
                              <td><center><img src={image} style={{ width: '30px' }} /></center></td>
                              <td><a href={`https://ipfs.io/ipfs/${uri.replace('ipfs://ipfs/', '')}`} target='_blank'>{uri}</a></td>
                            </tr>
                        )

                      })
                    }
                  </tbody>
                </Table>
              </div>
            )
          )
        }
      </>
    );
  }

}
export default MintToken;
